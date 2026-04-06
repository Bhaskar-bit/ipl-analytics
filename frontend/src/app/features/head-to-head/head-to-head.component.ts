import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgxEchartsModule } from 'ngx-echarts';
import { TeamService } from '../../core/services/team.service';
import { MatchService } from '../../core/services/match.service';
import { Team, Match } from '../../core/models';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { getTeamColor } from '../../core/utils/color-palette.util';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-head-to-head',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsModule, ErrorStateComponent],
  templateUrl: './head-to-head.component.html',
  styleUrls: ['./head-to-head.component.scss'],
})
export class HeadToHeadComponent implements OnInit {
  teams = signal<Team[]>([]);
  selectedTeam1Id = signal<string>('');
  selectedTeam2Id = signal<string>('');
  matches = signal<Match[]>([]);
  error = signal<string | null>(null);
  loading = signal(false);

  winTimelineOption = signal<EChartsOption>({});
  winSplitOption = signal<EChartsOption>({});

  team1Wins = computed(() => this.matches().filter((m) => m.winner_id === this.selectedTeam1Id()).length);
  team2Wins = computed(() => this.matches().filter((m) => m.winner_id === this.selectedTeam2Id()).length);
  noResults = computed(() => this.matches().filter((m) => !m.winner_id).length);
  team1 = computed(() => this.teams().find((t) => t.id === this.selectedTeam1Id()) ?? null);
  team2 = computed(() => this.teams().find((t) => t.id === this.selectedTeam2Id()) ?? null);

  constructor(
    private teamService: TeamService,
    private matchService: MatchService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.teamService.getAllTeams().subscribe((t) => {
      this.teams.set(t);
      const qp = this.route.snapshot.queryParams;
      if (qp['team1']) this.selectedTeam1Id.set(qp['team1']);
      if (qp['team2']) this.selectedTeam2Id.set(qp['team2']);
      if (qp['team1'] && qp['team2']) this.compare();
    });
  }

  compare(): void {
    if (!this.selectedTeam1Id() || !this.selectedTeam2Id()) return;
    this.loading.set(true);
    this.error.set(null);
    this.matchService.getHeadToHeadMatches(this.selectedTeam1Id(), this.selectedTeam2Id()).subscribe({
      next: (matches) => {
        this.matches.set(matches);
        this.loading.set(false);
        this.buildCharts();
      },
      error: (e) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  buildCharts(): void {
    const t1 = this.team1();
    const t2 = this.team2();
    if (!t1 || !t2) return;

    const t1Color = getTeamColor(t1.short_name);
    const t2Color = getTeamColor(t2.short_name);

    // Win split donut
    this.winSplitOption.set({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, data: [t1.short_name, t2.short_name, 'No Result'] },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        data: [
          { value: this.team1Wins(), name: t1.short_name, itemStyle: { color: t1Color } },
          { value: this.team2Wins(), name: t2.short_name, itemStyle: { color: t2Color } },
          { value: this.noResults(), name: 'No Result', itemStyle: { color: '#9ca3af' } },
        ],
        label: { formatter: '{b}: {c}' },
      }],
    });

    // Win timeline scatter
    const data1 = this.matches()
      .filter((m) => m.winner_id === this.selectedTeam1Id())
      .map((m) => [m.season, t1.short_name]);
    const data2 = this.matches()
      .filter((m) => m.winner_id === this.selectedTeam2Id())
      .map((m) => [m.season, t2.short_name]);

    this.winTimelineOption.set({
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: 'Season', min: 2008 },
      yAxis: { type: 'category', data: [t1.short_name, t2.short_name] },
      series: [
        { type: 'scatter', name: t1.short_name, data: data1, itemStyle: { color: t1Color }, symbolSize: 10 },
        { type: 'scatter', name: t2.short_name, data: data2, itemStyle: { color: t2Color }, symbolSize: 10 },
      ],
    });
  }

  getColor(name: string): string { return getTeamColor(name); }
}
