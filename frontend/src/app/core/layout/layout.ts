import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Navbar],
  template: `
    <app-navbar />
    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    main {
      display: block;
    }
  `,
})
export class Layout {}
