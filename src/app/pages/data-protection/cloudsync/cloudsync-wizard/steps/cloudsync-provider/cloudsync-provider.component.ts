import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { Observable, combineLatest, filter, of, skipWhile, switchMap } from 'rxjs';
import { CloudsyncProviderName, cloudsyncProviderFormMap, cloudsyncProviderNameMap, tokenOnlyProviders } from 'app/enums/cloudsync-provider.enum';
import { helptextSystemCloudcredentials as helptext } from 'app/helptext/system/cloud-credentials';
import { CloudsyncCredential, CloudsyncCredentialUpdate } from 'app/interfaces/cloudsync-credential.interface';
import { CloudsyncProvider } from 'app/interfaces/cloudsync-provider.interface';
import { Option } from 'app/interfaces/option.interface';
import { WebsocketError } from 'app/interfaces/websocket-error.interface';
import { FormErrorHandlerService } from 'app/modules/ix-forms/services/form-error-handler.service';
import { forbiddenValues } from 'app/modules/ix-forms/validators/forbidden-values-validation/forbidden-values-validation';
import { SnackbarService } from 'app/modules/snackbar/services/snackbar.service';
import { BaseProviderFormComponent } from 'app/pages/credentials/backup-credentials/cloud-credentials-form/provider-forms/base-provider-form';
import { TokenProviderFormComponent } from 'app/pages/credentials/backup-credentials/cloud-credentials-form/provider-forms/token-provider-form/token-provider-form.component';
import { CloudsyncFormComponent } from 'app/pages/data-protection/cloudsync/cloudsync-form/cloudsync-form.component';
import { CloudCredentialService } from 'app/services/cloud-credential.service';
import { DialogService } from 'app/services/dialog.service';
import { ErrorHandlerService } from 'app/services/error-handler.service';
import { IxSlideInService } from 'app/services/ix-slide-in.service';
import { WebSocketService } from 'app/services/ws.service';

@UntilDestroy()
@Component({
  selector: 'ix-cloudsync-provider',
  templateUrl: './cloudsync-provider.component.html',
  styleUrls: ['./cloudsync-provider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudsyncProviderComponent implements OnInit {
  form = this.formBuilder.group({
    name: ['Storj', Validators.required],
    provider: [CloudsyncProviderName.Storj],
    exist_credential: [null as number],
  });

  isLoading = false;
  providers: CloudsyncProvider[] = [];
  credentials: CloudsyncCredential[] = [];
  providerOptions$: Observable<Option[]>;
  providerForm: BaseProviderFormComponent;
  forbiddenNames: string[] = [];
  existCredentialOptions$: Observable<Option[]>;
  googleDriveProviderId: number;

  @ViewChild('providerFormContainer', { static: true, read: ViewContainerRef }) providerFormContainer: ViewContainerRef;

  readonly helptext = helptext;

  constructor(
    private ws: WebSocketService,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    private errorHandler: ErrorHandlerService,
    private slideIn: IxSlideInService,
    private dialogService: DialogService,
    private formErrorHandler: FormErrorHandlerService,
    private translate: TranslateService,
    private snackbarService: SnackbarService,
    private cloudCredentialService: CloudCredentialService,
  ) {}

  get selectedProvider(): CloudsyncProvider {
    return this.providers?.find((provider) => {
      return provider.name === this.form.controls.provider.value;
    });
  }

  get selectedCredential(): CloudsyncCredential {
    return this.credentials?.find((credential) => {
      return credential.id === this.form.controls.exist_credential.value;
    });
  }

  get areActionsDisabled(): boolean {
    return this.isLoading
      || this.form.invalid
      || this.providerForm?.form?.invalid;
  }

  ngOnInit(): void {
    this.setFormEvents();
    this.loadProviders();

    if (this.selectedCredential) {
      this.setCredentialsForEdit();
    }
  }

  getPayload(): CloudsyncCredentialUpdate {
    const commonValues = this.form.value;
    return {
      name: commonValues.name,
      provider: commonValues.provider,
      attributes: this.providerForm.getSubmitAttributes(),
    };
  }

  setCredentialsForEdit(): void {
    this.form.controls.name.clearValidators();
    this.form.patchValue({
      provider: this.selectedCredential.provider,
      name: this.selectedCredential.name,
    });

    if (this.providerForm) {
      this.providerForm.getFormSetter$().next(this.selectedCredential.attributes);
    }
  }

  onVerify(): void {
    this.isLoading = true;

    const beforeSubmit$ = this.providerForm.beforeSubmit();

    beforeSubmit$
      .pipe(
        switchMap(() => {
          const { name, ...payload } = this.getPayload();
          return this.ws.call('cloudsync.credentials.verify', [payload]);
        }),
        untilDestroyed(this),
      )
      .subscribe({
        next: (response) => {
          if (response.valid) {
            this.snackbarService.success(this.translate.instant('The credentials are valid.'));
          } else {
            this.dialogService.error({
              title: this.translate.instant('Error'),
              message: response.excerpt,
              backtrace: response.error,
            });
          }

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isLoading = false;
          this.formErrorHandler.handleWsFormError(error, this.form);
          this.cdr.markForCheck();
        },
      });
  }

  openAdvanced(): void {
    this.slideIn.open(CloudsyncFormComponent, { wide: true });
  }

  private loadProviders(): void {
    this.isLoading = true;
    combineLatest([
      this.cloudCredentialService.getProviders(),
      this.cloudCredentialService.getCloudsyncCredentials(),
    ])
      .pipe(untilDestroyed(this))
      .subscribe({
        next: ([providers, credentials]) => {
          this.providers = providers;
          this.credentials = credentials;
          this.providerOptions$ = of(providers.map((provider) => ({
            label: provider.title,
            value: provider.name,
          })));
          this.existCredentialOptions$ = of(credentials.map((credential) => {
            if (credential.provider === CloudsyncProviderName.GoogleDrive) {
              this.googleDriveProviderId = credential.id;
            }

            return {
              label: `${credential.name} (${cloudsyncProviderNameMap.get(credential.provider)})`,
              value: credential.id,
            };
          }).sort((a, b) => a.label.localeCompare(b.label)));
          this.setNamesInUseValidator(credentials);
          this.renderProviderForm();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error: WebsocketError) => {
          this.isLoading = false;
          this.dialogService.error(this.errorHandler.parseWsError(error));
        },
      });
  }

  private setNamesInUseValidator(credentials: CloudsyncCredential[]): void {
    this.forbiddenNames = credentials.map((credential) => credential.name);
    this.form.controls.name.addValidators(forbiddenValues(this.forbiddenNames));
  }

  private setFormEvents(): void {
    this.form.controls.provider.valueChanges
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        this.renderProviderForm();
        this.setDefaultName();
      });

    this.form.controls.exist_credential.valueChanges
      .pipe(
        filter(Boolean),
        skipWhile(() => !this.selectedCredential),
        untilDestroyed(this),
      )
      .subscribe(() => {
        this.renderProviderForm();
        this.setCredentialsForEdit();
      });
  }

  private setDefaultName(): void {
    let name = cloudsyncProviderNameMap.get(this.form.controls.provider.value);
    let suffix = 2;
    while (this.forbiddenNames.includes(name)) {
      name = `${name} ${suffix}`;
      suffix++;
    }

    this.form.controls.name.setValue(name);
  }


  private renderProviderForm(): void {
    this.providerFormContainer?.clear();
    if (!this.selectedProvider) {
      return;
    }

    const formClass = this.getProviderFormClass();
    const formRef = this.providerFormContainer.createComponent(formClass);
    formRef.instance.provider = this.selectedProvider;
    this.providerForm = formRef.instance;
  }

  private getProviderFormClass(): Type<BaseProviderFormComponent> {
    if (tokenOnlyProviders.includes(this.selectedProvider.name)) {
      return TokenProviderFormComponent;
    }

    return cloudsyncProviderFormMap.get(this.selectedProvider.name);
  }
}