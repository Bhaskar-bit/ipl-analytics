import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgxEchartsModule } from 'ngx-echarts';
import { TeamService } from '../../../core/services/team.service';
import { Team, TeamStats, SeasonRecord, HomeAwayRecord } from '../../../core/models';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { getTeamColor } from '../../../core/utils/color-palette.util';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NgxEchartsModule, StatCardComponent, ErrorStateComponent],
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss'],
})
export class TeamDetailComponent implements OnInit {
  @Input() id!: string;

  team = signal<Team | null>(null);
  stats = signal<TeamStats | null>(null);
  homeAway = signal<HomeAwayRecord | null>(null);
  seasonRecords = signal<SeasonRecord[]>([]);
  error = signal<string | null>(null);

  winRateChartOption = signal<EChartsOption>({});
  seasonChartOption = signal<EChartsOption>({});
  homeAwayChartOption = signal<EChartsOption>({});

  constructor(private teamService: TeamService) {}

  ngOnInit(): void {
    this.loadTeam();
  }

  loadTeam(): void {
    this.teamService.getTeamById(this.id).subscribe({
      next: (teams) => {
        if (teams.length) {
          this.team.set(teams[0]);
          this.loadStats();
        }
      },
      error: (e) => this.error.set(e.message),
    });
  }

  loadStats(): void {
    this.teamService.getTeamStats(this.id).subscribe({
      next: (s) => {
        this.stats.set(s);
        this.buildWinRateChart(s);
      },
    });

    this.teamService.getHomeAwayRecord(this.id).subscribe({
      next: (ha) => {
        this.homeAway.set(ha);
        this.buildHomeAwayChart(ha);
      },
    });

    this.teamService.getSeasonWiseRecord(this.id).subscribe({
      next: (r) => {
        this.seasonRecords.set(r);
        this.buildSeasonChart(r);
      },
    });
  }

  buildWinRateChart(s: TeamStats): void {
    const color = getTeamColor(this.team()?.short_name ?? '');
    this.winRateChartOption.set({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['50%', '75%'],
        data: [
          { value: s.wins, name: 'Wins', itemStyle: { color } },
          { value: s.losses, name: 'Losses', itemStyle: { color: '#e5e7eb' } },
          { value: s.no_results, name: 'No Result', itemStyle: { color: '#9ca3af' } },
        ],
        label: { show: false },
      }],
    });
  }

  buildHomeAwayChart(ha: HomeAwayRecord): void {
    this.homeAwayChartOption.set({
      tooltip: { trigger: 'axis' },
      legend: { data: ['Home Win%', 'Away Win%'] },
      xAxis: { type: 'category', data: ['Home', 'Away'] },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        { name: 'Home Win%', type: 'bar', data: [Math.round(ha.home_win_rate * 100), null], itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } },
        { name: 'Away Win%', type: 'bar', data: [null, Math.round(ha.away_win_rate * 100)], itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
      ],
    });
  }

  buildSeasonChart(records: SeasonRecord[]): void {
    this.seasonChartOption.set({
      tooltip: { trigger: 'axis' },
      legend: { data: ['Wins', 'Points'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: records.map((r) => r.season.toString()) },
      yAxis: [
        { type: 'value', name: 'Wins' },
        { type: 'value', name: 'Points' },
      ],
      series: [
        { name: 'Wins', type: 'bar', data: records.map((r) => r.wins), itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } },
        { name: 'Points', type: 'line', yAxisIndex: 1, data: records.map((r) => r.points), lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'circle', symbolSize: 6 },
      ],
    });
  }

  getTeamColor(name: string): string { return getTeamColor(name); }
}
