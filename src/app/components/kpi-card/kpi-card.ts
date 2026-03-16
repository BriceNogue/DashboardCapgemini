import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss'
})
export class KpiCardComponent {
  title = input.required<string>();
  value = input.required<string>();
  unit = input<string>('');
  icon = input<string>('');
  trend = input<string>('');
  color = input<string>('primary');
}
