import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ScreenType } from '../../../../enums/screen-type.enum';

@Component({
  selector: 'ix-widget-backups-empty',
  templateUrl: './widget-backups-empty.component.html',
  styleUrls: [
    '../widget/widget.component.scss',
    './widget-backups-empty.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WidgetBackupsEmptyComponent {
  @Input() state = 1;

  protected readonly ScreenType = ScreenType;
}
