import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { PredictionRequest, PredictionResult, FeatureImportanceItem } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly baseUrl = environment.fastapiUrl;

  predictionLoading = signal(false);
  predictionError = signal<string | null>(null);
  lastPrediction = signal<PredictionResult | null>(null);

  constructor(private http: HttpClient) {}

  predictWinner(request: PredictionRequest): Observable<PredictionResult> {
    this.predictionLoading.set(true);
    this.predictionError.set(null);

    return this.http.post<PredictionResult>(`${this.baseUrl}/predict/match-winner`, request).pipe(
      tap((result) => {
        this.lastPrediction.set(result);
        this.predictionLoading.set(false);
      }),
      catchError((err) => {
        this.predictionLoading.set(false);
        this.predictionError.set(err.message ?? 'Prediction failed');
        return throwError(() => err);
      })
    );
  }

  getFeatureImportance(): Observable<{ model_version: string; features: FeatureImportanceItem[] }> {
    return this.http.get<{ model_version: string; features: FeatureImportanceItem[] }>(
      `${this.baseUrl}/predict/feature-importance`
    );
  }

  checkHealth(): Observable<{ status: string; model_loaded: boolean; model_version: string }> {
    return this.http.get<{ status: string; model_loaded: boolean; model_version: string }>(
      `${this.baseUrl}/health`
    );
  }
}
