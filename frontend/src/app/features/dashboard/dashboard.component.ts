import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgxEchartsModule } from 'ngx-echarts';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SeasonService } from '../../core/services/season.service';
import { PlayerService } from '../../core/services/player.service';
import { MatchService } from '../../core/services/match.service';
import { SeasonSummary, Match, BattingLeader, RunTrendPoint } from '../../core/models';
import { CHART_PALETTE } from '../../core/utils/color-palette.util';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgxEchartsModule, StatCardComponent, ErrorStateComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  summary = signal<SeasonSummary | null>(null);
  recentMatches = signal<Match[]>([]);
  topBatsmen = signal<BattingLeader[]>([]);
  runTrend = signal<RunTrendPoint[]>([]);
  error = signal<string | null>(null);
  currentSeason = signal<number>(2024);

  runTrendChartOption = signal<EChartsOption>({});
  sixesChartOption = signal<EChartsOption>({});

  constructor(
    public seasonService: SeasonService,
    private playerService: PlayerService,
    private matchService: MatchService
  ) {}

  ngOnInit(): void {
    const season = this.seasonService.currentSeason();
    this.currentSeason.set(season);
    this.loadData(season);
  }

  loadData(season: number): void {
    this.seasonService.getSeasonSummary(season).subscribe({
      next: (s) => this.summary.set(s),
      error: (e) => this.error.set(e.message),
    });

    this.matchService.getRecentMatches(6).subscribe({
      next: (m) => this.recentMatches.set(m),
    });

    this.playerService.getTopBatsmen(season, 5).subscribe({
      next: (b) => this.topBatsmen.set(b),
    });

    this.seasonService.getSeasonRunTrend().subscribe({
      next: (data) => {
        this.runTrend.set(data);
        this.buildCharts(data);
      },
    });
  }

  buildCharts(data: RunTrendPoint[]): void {
    const seasons = data.map((d) => d.season.toString());
    const avgScores = data.map((d) => d.avg_score);
    const sixes = data.map((d) => d.total_sixes);

    this.runTrendChartOption.set({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: seasons, axisLabel: { color: 'var(--text-secondary)' } },
      yAxis: { type: 'value', axisLabel: { color: 'var(--text-secondary)' } },
      series: [{
        name: 'Avg Score',
        type: 'line',
        data: avgScores,
        smooth: true,
        lineStyle: { width: 3, color: CHART_PALETTE[0] },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: CHART_PALETTE[0] + '44' }, { offset: 1, color: 'transparent' }] } },
        symbol: 'circle',
        symbolSize: 6,
      }],
    });

    this.sixesChartOption.set({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: seasons, axisLabel: { color: 'var(--text-secondary)' } },
      yAxis: { type: 'value', axisLabel: { color: 'var(--text-secondary)' } },
      series: [{
        name: 'Total Sixes',
        type: 'bar',
        data: sixes,
        itemStyle: { color: CHART_PALETTE[2], borderRadius: [4, 4, 0, 0] },
      }],
    });
  }
}
