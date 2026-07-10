import { Injectable, computed, signal } from '@angular/core';

/** The non-standard event Chromium fires when the app is installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'barkast.install.dismissed';
// Stay quiet for a while after the user dismisses the prompt, rather than forever.
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/**
 * Tracks Progressive-Web-App installability and drives the install prompt.
 *
 * Chromium browsers hand us a `beforeinstallprompt` event we can replay on a user gesture
 * (captured early in main.ts). iOS Safari has no such API, so there we surface manual
 * "Zet op beginscherm" instructions instead. Already-installed / dismissed states stay hidden.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  private deferred: BeforeInstallPromptEvent | null = null;

  /** A native install prompt is available to replay (Android/desktop Chromium). */
  readonly canInstall = signal(false);
  /** The app is already running as an installed PWA. */
  readonly installed = signal(this.isStandalone());

  readonly isIOS = this.detectIOS();
  readonly isMobile = this.detectMobile();

  /**
   * Whether to show our install affordance: on mobile, not already installed, not recently
   * dismissed, and either a native prompt is ready or we're on installable iOS Safari.
   */
  readonly showInstall = computed(
    () =>
      this.isMobile &&
      !this.installed() &&
      !this.snoozed() &&
      (this.canInstall() || (this.isIOS && this.isSafari())),
  );

  private readonly snoozeUntil = signal(this.readSnooze());
  private readonly snoozed = computed(() => this.snoozeUntil() > this.now());

  constructor() {
    // Pick up an install event captured before Angular booted, plus any that arrive later.
    this.adoptStashedPrompt();
    window.addEventListener('barkast:installable', () => this.adoptStashedPrompt());
    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.canInstall.set(false);
      this.deferred = null;
    });
  }

  /** Replay the native install prompt. Returns true if the user accepted. */
  async install(): Promise<boolean> {
    const evt = this.deferred;
    if (!evt) return false;
    this.canInstall.set(false);
    this.deferred = null;
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === 'accepted') this.installed.set(true);
      return outcome === 'accepted';
    } catch {
      return false;
    }
  }

  /** Hide the prompt for a while. */
  dismiss(): void {
    const until = this.now() + SNOOZE_MS;
    this.snoozeUntil.set(until);
    try {
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch {
      /* storage unavailable — ignore */
    }
  }

  private adoptStashedPrompt(): void {
    const stashed = (window as unknown as { __barkastInstallPrompt?: BeforeInstallPromptEvent })
      .__barkastInstallPrompt;
    if (stashed) {
      this.deferred = stashed;
      this.canInstall.set(true);
    }
  }

  private isStandalone(): boolean {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }

  private detectIOS(): boolean {
    const ua = navigator.userAgent;
    const iOSDevice = /iP(hone|ad|od)/.test(ua);
    // iPadOS 13+ reports as Mac; detect via touch support.
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOSDevice || iPadOS;
  }

  private isSafari(): boolean {
    const ua = navigator.userAgent;
    // Exclude other iOS browsers (Chrome/Firefox on iOS) that can't add to home screen the same way.
    return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  }

  private detectMobile(): boolean {
    if (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)) return true; // iPad
    return /Android|iP(hone|ad|od)|Mobile|Windows Phone/i.test(navigator.userAgent);
  }

  private readSnooze(): number {
    try {
      return Number(localStorage.getItem(DISMISS_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  private now(): number {
    return Date.now();
  }
}
