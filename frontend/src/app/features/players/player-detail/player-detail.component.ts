import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import { PlayerService } from '../../../core/services/player.service';
import { Player, BattingStats, BowlingStats, FormIndex, HeatmapCell } from '../../../core/models';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-player-detail',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule, StatCardComponent, ErrorStateComponent],
  templateUrl: './player-detail.component.html',
  styleUrls: ['./player-detail.component.scss'],
})
export class PlayerDetailComponent implements OnInit {
  @Input() id!: string;

  player = signal<Player | null>(null);
  battingStats = signal<BattingStats | null>(null);
  bowlingStats = signal<BowlingStats | null>(null);
  formIndex = signal<FormIndex | null>(null);
  error = signal<string | null>(null);

  heatmapOption = signal<EChartsOption>({});
  formGaugeOption = signal<EChartsOption>({});

  constructor(private playerService: PlayerService) {}

  ngOnInit(): void {
    this.playerService.getPlayerById(this.id).subscribe({
      next: (players) => {
        if (players.length) {
          this.player.set(players[0]);
          this.loadStats();
        }
      },
      error: (e) => this.error.set(e.message),
    });
  }

  loadStats(): void {
    this.playerService.getBattingStats(this.id).subscribe({
      next: (s) => this.battingStats.set(s),
    });

    this.playerService.getBowlingStats(this.id).subscribe({
      next: (s) => this.bowlingStats.set(s),
    });

    this.playerService.getFormIndex(this.id, 5).subscribe({
      next: (f) => {
        this.formIndex.set(f);
        this.buildFormGauge(f);
      },
    });

    this.playerService.getPerformanceHeatmap(this.id).subscribe({
      next: (cells) => this.buildHeatmap(cells),
    });
  }

  buildFormGauge(form: FormIndex): void {
    this.formGaugeOption.set({
      series: [{
        type: 'gauge',
        min: 0, max: 100,
        progress: { show: true, width: 12 },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 12 } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text-primary)',
          offsetCenter: [0, '0%'],
        },
        data: [{ value: Math.round(form.form_score), name: 'Form Score' }],
        title: { fontSize: 12, color: 'var(--text-secondary)', offsetCenter: [0, '40%'] },
      }],
    });
  }

  buildHeatmap(cells: HeatmapCell[]): void {
    const overBrackets = ['PP (1-6)', 'Middle (7-15)', 'Death (16-20)'];
    const runCategories = ['Dot', '1-2 runs', '3-4 runs', '6+'];
    const data = cells.map((c) => [
      overBrackets.indexOf(c.over_bracket),
      runCategories.indexOf(c.run_category),
      c.count,
    ]);

    this.heatmapOption.set({
      tooltip: { position: 'top', formatter: (p: any) => `${overBrackets[p.data[0]]} / ${runCategories[p.data[1]]}: ${p.data[2]} times` },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: overBrackets },
      yAxis: { type: 'category', data: runCategories },
      visualMap: {
        min: 0, max: Math.max(...cells.map((c) => c.count), 1),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: { color: ['#e0f2fe', '#0284c7'] },
      },
      series: [{
        type: 'heatmap',
        data,
        label: { show: true, fontSize: 10 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    });
  }
}
