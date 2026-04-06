import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgxEchartsModule } from 'ngx-echarts';
import { SeasonService } from '../../../core/services/season.service';
import { PlayerService } from '../../../core/services/player.service';
import { MatchService } from '../../../core/services/match.service';
import { SeasonSummary, PointsTableRow, Match, BattingLeader, BowlingLeader } from '../../../core/models';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { getTeamColor } from '../../../core/utils/color-palette.util';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-season-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NgxEchartsModule, StatCardComponent, ErrorStateComponent],
  templateUrl: './season-detail.component.html',
  styleUrls: ['./season-detail.component.scss'],
})
export class SeasonDetailComponent implements OnInit {
  @Input() year!: string;

  summary = signal<SeasonSummary | null>(null);
  pointsTable = signal<PointsTableRow[]>([]);
  matches = signal<Match[]>([]);
  topBatsmen = signal<BattingLeader[]>([]);
  topBowlers = signal<BowlingLeader[]>([]);
  error = signal<string | null>(null);

  pointsChartOption = signal<EChartsOption>({});

  constructor(
    private seasonService: SeasonService,
    private playerService: PlayerService,
    private matchService: MatchService
  ) {}

  get season(): number { return parseInt(this.year, 10); }

  ngOnInit(): void {
    const yr = this.season;

    this.seasonService.getSeasonSummary(yr).subscribe({
      next: (s) => this.summary.set(s),
      error: (e) => this.error.set(e.message),
    });

    this.seasonService.getPointsTable(yr).subscribe({
      next: (p) => {
        this.pointsTable.set(p);
        this.buildPointsChart(p);
      },
    });

    this.matchService.getMatchesBySeason(yr).subscribe({
      next: (m) => this.matches.set(m),
    });

    this.playerService.getTopBatsmen(yr, 10).subscribe({
      next: (b) => this.topBatsmen.set(b),
    });

    this.playerService.getTopBowlers(yr, 10).subscribe({
      next: (b) => this.topBowlers.set(b),
    });
  }

  buildPointsChart(table: PointsTableRow[]): void {
    this.pointsChartOption.set({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: [...table].reverse().map((r) => r.team_short_name) },
      series: [
        { name: 'Points', type: 'bar', data: [...table].reverse().map((r) => r.points), itemStyle: { color: (p: any) => getTeamColor(table[table.length - 1 - p.dataIndex]?.team_short_name), borderRadius: [0, 4, 4, 0] } },
      ],
    });
  }

  stageLabel(stage: string): string {
    const map: Record<string, string> = {
      group: 'GS', qualifier1: 'Q1', eliminator: 'EL', qualifier2: 'Q2', final: 'Final',
    };
    return map[stage] ?? stage;
  }

  getTeamColor(name: string): string { return getTeamColor(name); }
}
