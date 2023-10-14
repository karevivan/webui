import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import helptext from '../../../../helptext/data-protection/cloudsync/cloudsync-form';
import { FilesystemService } from 'app/services/filesystem.service';

@Component({
  selector: 'ix-cloudsync-wizard',
  templateUrl: './cloudsync-wizard.component.html',
  styleUrls: ['./cloudsync-wizard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CloudsyncWizardComponent {
  form = new FormGroup({});

  whateverControl = new FormControl('');

  providers$ = of([
    { label: 'Storj iX', value: 'Storj iX' },
  ]);

  directionOptions$ = of([
    { label: 'Pull', value: 'Pull' },
  ]);

  transferModeOptions$ = of([
    { label: 'Copy', value: 'Copy' },
  ]);

  protected readonly helptext = helptext;

  readonly fileNodeProvider = this.filesystemService.getFilesystemNodeProvider();

  constructor(
    private filesystemService: FilesystemService,
  ) {
  }
}
