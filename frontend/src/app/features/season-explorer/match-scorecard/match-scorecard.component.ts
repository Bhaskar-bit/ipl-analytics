import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatchService } from '../../../core/services/match.service';
import { Scorecard } from '../../../core/models';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';

@Component({
  selector: 'app-match-scorecard',
  standalone: true,
  imports: [CommonModule, RouterLink, ErrorStateComponent],
  templateUrl: './match-scorecard.component.html',
  styleUrls: ['./match-scorecard.component.scss'],
})
export class MatchScorecardComponent implements OnInit {
  @Input() year!: string;
  @Input() matchId!: string;

  scorecard = signal<Scorecard | null>(null);
  error = signal<string | null>(null);

  constructor(private matchService: MatchService) {}

  ngOnInit(): void {
    this.matchService.getMatchScorecard(this.matchId).subscribe({
      next: (s) => this.scorecard.set(s),
      error: (e) => this.error.set(e.message),
    });
  }
}
