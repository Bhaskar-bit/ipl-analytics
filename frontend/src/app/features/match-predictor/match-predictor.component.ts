import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsModule } from 'ngx-echarts';
import { TeamService } from '../../core/services/team.service';
import { PredictionService } from '../../core/services/prediction.service';
import { SeasonService } from '../../core/services/season.service';
import { Team, PredictionRequest, PredictionResult, MatchStage, Venue } from '../../core/models';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { getTeamColor } from '../../core/utils/color-palette.util';
import type { EChartsOption } from 'echarts';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-match-predictor',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsModule, ErrorStateComponent],
  templateUrl: './match-predictor.component.html',
  styleUrls: ['./match-predictor.component.scss'],
})
export class MatchPredictorComponent implements OnInit {
  teams = signal<Team[]>([]);
  venues = signal<Venue[]>([]);
  seasons = signal<number[]>([]);
  result = signal<PredictionResult | null>(null);

  formTeamAId = signal('');
  formTeamBId = signal('');
  formVenueId = signal('');
  formTossWinner = signal<'team_a' | 'team_b'>('team_a');
  formTossDecision = signal<'bat' | 'field'>('bat');
  formSeason = signal<number>(2024);
  formStage = signal<MatchStage>('group');

  gaugeOption = signal<EChartsOption>({});
  featureOption = signal<EChartsOption>({});

  stages: { value: MatchStage; label: string }[] = [
    { value: 'group', label: 'Group Stage' },
    { value: 'qualifier1', label: 'Qualifier 1' },
    { value: 'eliminator', label: 'Eliminator' },
    { value: 'qualifier2', label: 'Qualifier 2' },
    { value: 'final', label: 'Final' },
  ];

  constructor(
    private teamService: TeamService,
    private predService: PredictionService,
    private seasonService: SeasonService,
    private sb: SupabaseService
  ) {}

  get loading() { return this.predService.predictionLoading; }
  get error() { return this.predService.predictionError; }

  ngOnInit(): void {
    this.teamService.getAllTeams().subscribe((t) => this.teams.set(t));
    this.sb.query<Venue>('venues', { order: { column: 'name' } }).subscribe((v) => this.venues.set(v));
    this.seasonService.getAllSeasons().subscribe(() => {
      this.seasons.set(this.seasonService.seasonYears());
      this.formSeason.set(this.seasonService.currentSeason());
    });
  }

  predict(): void {
    if (!this.formTeamAId() || !this.formTeamBId() || !this.formVenueId()) return;
    const req: PredictionRequest = {
      team_a_id: this.formTeamAId(),
      team_b_id: this.formTeamBId(),
      venue_id: this.formVenueId(),
      toss_winner: this.formTossWinner(),
      toss_decision: this.formTossDecision(),
      season: this.formSeason(),
      stage: this.formStage(),
    };

    this.predService.predictWinner(req).subscribe({
      next: (r) => {
        this.result.set(r);
        this.buildGauge(r);
        this.buildFeatureChart(r);
      },
    });
  }

  buildGauge(r: PredictionResult): void {
    const prob = Math.round(r.team_a.win_probability * 100);
    const t1Color = getTeamColor(r.team_a.short_name);
    const t2Color = getTeamColor(r.team_b.short_name);

    this.gaugeOption.set({
      series: [{
        type: 'gauge',
        min: 0, max: 100,
        startAngle: 180, endAngle: 0,
        radius: '90%',
        axisLine: {
          lineStyle: {
            width: 20,
            color: [[prob / 100, t1Color], [1, t2Color]],
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          width: 12, length: '60%', itemStyle: { color: 'auto' },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          formatter: `{a|${r.team_a.short_name}}\n{b|${prob}% - ${100 - prob}%}\n{c|${r.team_b.short_name}}`,
          rich: {
            a: { fontSize: 14, fontWeight: 700, color: t1Color, lineHeight: 28 },
            b: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 32 },
            c: { fontSize: 14, fontWeight: 700, color: t2Color, lineHeight: 28 },
          },
          offsetCenter: [0, '60%'],
        },
        data: [{ value: prob }],
      }],
    });
  }

  buildFeatureChart(r: PredictionResult): void {
    const sorted = [...r.feature_contributions].sort((a, b) => b.value - a.value);
    this.featureOption.set({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category', data: sorted.map((f) => f.label) },
      series: [{
        type: 'bar',
        data: sorted.map((f) => Math.round(f.value * 100)),
        itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11 },
      }],
    });
  }

  getColor(name: string): string { return getTeamColor(name); }

  getConfidenceColor(level: string): string {
    const map: Record<string, string> = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
    return map[level] ?? '#6b7280';
  }

  teamName(id: string): string {
    return this.teams().find((t) => t.id === id)?.short_name ?? '';
  }
}
