import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlayerService } from '../../../core/services/player.service';
import { Player, PlayerRole } from '../../../core/models';

@Component({
  selector: 'app-players-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './players-list.component.html',
  styleUrls: ['./players-list.component.scss'],
})
export class PlayersListComponent implements OnInit {
  allPlayers = signal<Player[]>([]);
  searchQuery = signal('');
  selectedRole = signal<PlayerRole | ''>('');

  filteredPlayers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const role = this.selectedRole();
    return this.allPlayers().filter((p) => {
      const matchesSearch = p.display_name.toLowerCase().includes(q) || p.nationality.toLowerCase().includes(q);
      const matchesRole = !role || p.primary_role === role;
      return matchesSearch && matchesRole;
    });
  });

  roles: { value: PlayerRole | ''; label: string }[] = [
    { value: '', label: 'All Roles' },
    { value: 'batsman', label: 'Batsman' },
    { value: 'bowler', label: 'Bowler' },
    { value: 'allrounder', label: 'Allrounder' },
    { value: 'wk-batsman', label: 'WK-Batsman' },
  ];

  constructor(private playerService: PlayerService) {}

  ngOnInit(): void {
    this.playerService.getAllPlayers().subscribe((p) => this.allPlayers.set(p));
  }

  roleIcon(role: PlayerRole): string {
    const icons: Record<PlayerRole, string> = {
      batsman: '🏏',
      bowler: '⚾',
      allrounder: '⭐',
      'wk-batsman': '🧤',
    };
    return icons[role] ?? '👤';
  }
}
