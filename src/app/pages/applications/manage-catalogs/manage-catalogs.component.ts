import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog/dialog-ref';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { JobState } from 'app/enums/job-state.enum';
import helptext from 'app/helptext/apps/apps';
import { Catalog, CatalogQueryParams } from 'app/interfaces/catalog.interface';
import { CoreEvent } from 'app/interfaces/events';
import { CatalogAddFormComponent } from 'app/pages/applications/forms/catalog-add-form/catalog-add-form.component';
import { CatalogEditFormComponent } from 'app/pages/applications/forms/catalog-edit-form/catalog-edit-form.component';
import { EntityJobComponent } from 'app/pages/common/entity/entity-job/entity-job.component';
import {
  EntityTableComponent,
} from 'app/pages/common/entity/entity-table/entity-table.component';
import { EntityTableAction, EntityTableConfig } from 'app/pages/common/entity/entity-table/entity-table.interface';
import { DialogService } from 'app/services';
import { AppLoaderService } from 'app/services/app-loader/app-loader.service';
import { IxModalService } from 'app/services/ix-modal.service';
import { WebSocketService } from 'app/services/ws.service';
import { ManageCatalogSummaryDialogComponent } from '../dialogs/manage-catalog-summary/manage-catalog-summary-dialog.component';

@UntilDestroy()
@Component({
  selector: 'app-manage-catalogs',
  template: '<entity-table [title]="title" [conf]="this"></entity-table>',
})
export class ManageCatalogsComponent implements EntityTableConfig<Catalog>, OnInit {
  title = 'Catalogs';
  queryCall = 'catalog.query' as const;
  wsDelete = 'catalog.delete' as const;
  queryCallOption: CatalogQueryParams = [[], { extra: { item_details: true } }];
  disableActionsConfig = true;

  columns = [
    {
      name: 'Name', prop: 'label', always_display: true, minWidth: 150,
    },
    {
      name: 'Catalog URL', prop: 'repository', always_display: true, maxWidth: 100,
    },
    {
      name: 'Branch', prop: 'branch', always_display: true, maxWidth: 100,
    },
    {
      name: 'Preferred Trains', prop: 'preferred_trains', always_display: true, maxWidth: 200,
    },
  ];

  rowIdentifier = 'id';
  config = {
    paging: true,
    sorting: { columns: this.columns },
    deleteMsg: {
      title: 'Catalog',
      key_props: ['label'],
    },
  };

  filterString = '';
  catalogSyncJobIds: number[] = [];

  private dialogRef: MatDialogRef<EntityJobComponent>;
  protected entityList: EntityTableComponent;
  protected loaderOpen = false;

  constructor(
    private mdDialog: MatDialog,
    private dialogService: DialogService,
    private loader: AppLoaderService,
    private ws: WebSocketService,
    private modalService: IxModalService,
  ) {}

  ngOnInit(): void {
    this.ws.subscribe('core.get_jobs').pipe(untilDestroyed(this)).subscribe((event) => {
      if (event.fields.method == 'catalog.sync') {
        const jobId = event.fields.id;
        if (!this.catalogSyncJobIds.includes(jobId) && event.fields.state === JobState.Running) {
          this.refresh();
          this.catalogSyncJobIds.push(jobId);
        }

        if (event.fields.state == JobState.Success || event.fields.state == JobState.Failed) {
          this.catalogSyncJobIds.splice(this.catalogSyncJobIds.indexOf(jobId));
        }
      }
    });

    this.modalService.onClose$.pipe(untilDestroyed(this)).subscribe(() => {
      this.refresh();
    });
  }

  refresh(): void {
    this.entityList.getData();
    this.entityList.filter(this.filterString);
  }

  afterInit(entityList: EntityTableComponent): void {
    this.entityList = entityList;
  }

  getActions(row: Catalog): EntityTableAction[] {
    return [
      {
        id: row.id,
        icon: 'edit',
        label: helptext.manageCatalogs.menu.edit,
        name: 'edit',
        onClick: (row: Catalog) => {
          this.edit(row);
        },
      },
      {
        id: row.id,
        icon: 'refresh',
        label: helptext.manageCatalogs.menu.refresh,
        name: 'refresh',
        onClick: (row: Catalog) => {
          this.refreshRow(row);
        },
      },
      {
        id: row.id,
        icon: 'delete',
        label: helptext.manageCatalogs.menu.delete,
        name: 'delete',
        disabled: row.builtin,
        onClick: (row: Catalog) => {
          this.entityList.doDelete(row);
        },
      },
      {
        id: row.id,
        icon: 'summary',
        label: helptext.manageCatalogs.menu.summary,
        name: 'summary',
        onClick: (row: Catalog) => {
          this.showSummary(row);
        },
      },
    ];
  }

  doAdd(): void {
    this.modalService.open(CatalogAddFormComponent);
  }

  edit(catalog: Catalog): void {
    const modal = this.modalService.open(CatalogEditFormComponent);
    modal.setCatalogForEdit(catalog);
  }

  refreshRow(row: Catalog): void {
    this.syncRow(row);
  }

  showSummary(row: Catalog): void {
    this.mdDialog.open(ManageCatalogSummaryDialogComponent, {
      width: '534px',
      data: row,
    });
  }

  onToolbarAction(evt: CoreEvent): void {
    if (evt.data.event_control == 'filter') {
      this.filterString = evt.data.filter;
      this.entityList.filter(this.filterString);
    } else if (evt.data.event_control == 'refresh_catalogs') {
      this.syncAll();
    } else if (evt.data.event_control == 'add_catalog') {
      this.doAdd();
    }
  }

  syncAll(): void {
    this.dialogRef = this.mdDialog.open(EntityJobComponent, {
      data: {
        title: helptext.refreshing,
      },
      disableClose: true,
    });
    this.dialogRef.componentInstance.setCall('catalog.sync_all');
    this.dialogRef.componentInstance.submit();
    this.dialogRef.componentInstance.success.pipe(untilDestroyed(this)).subscribe(() => {
      this.dialogService.closeAllDialogs();
      this.refresh();
    });
  }

  syncRow(row: Catalog): void {
    this.dialogRef = this.mdDialog.open(EntityJobComponent, {
      data: {
        title: helptext.refreshing,
      },
      disableClose: true,
    });
    this.dialogRef.componentInstance.setCall('catalog.sync', [row.label]);
    this.dialogRef.componentInstance.submit();
    this.dialogRef.componentInstance.success.pipe(untilDestroyed(this)).subscribe(() => {
      this.dialogService.closeAllDialogs();
      this.refresh();
    });
  }

  onRowClick(row: Catalog): void {
    this.showSummary(row);
  }
}
