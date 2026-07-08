import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatToolbarModule],
  template: `
    <mat-toolbar color="primary" class="navbar">
      <span class="brand" routerLink="/">🍸 CocktailApp</span>
      <span class="spacer"></span>
      <a mat-button routerLink="/dashboard" routerLinkActive="active">Home</a>
      <a mat-button routerLink="/cocktails" routerLinkActive="active">Cocktails</a>
      <a mat-button routerLink="/ingredients" routerLinkActive="active">Ingredients</a>
    </mat-toolbar>
  `,
  styles: `
    .navbar {
      margin-bottom: 4%;
      border-radius: 8px;
    }
    .brand {
      font-weight: 600;
      cursor: pointer;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .active {
      font-weight: 700;
    }
  `,
})
export class Navbar {}
