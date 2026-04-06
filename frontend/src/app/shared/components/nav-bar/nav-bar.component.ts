import { Component, EventEmitter, Output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
})
export class NavBarComponent {
  @Output() themeToggle = new EventEmitter<void>();

  menuOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid' },
    { label: 'Teams',     route: '/teams',     icon: 'shield' },
    { label: 'Players',   route: '/players',   icon: 'user' },
    { label: 'H2H',       route: '/head-to-head', icon: 'bar-chart-2' },
    { label: 'Predictor', route: '/predictor', icon: 'cpu' },
    { label: 'Seasons',   route: '/seasons',   icon: 'calendar' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }
}
