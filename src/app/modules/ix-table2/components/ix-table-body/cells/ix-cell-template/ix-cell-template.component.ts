import { Component } from '@angular/core';
import { Column, ColumnComponent } from 'app/modules/ix-table2/interfaces/table-column.interface';

@Component({
  template: '',
})
export class IxCellTemplateComponent<T> extends ColumnComponent<T> {}

export function templateColumn<T>(
  options: Partial<IxCellTemplateComponent<T>> = {},
): Column<T, IxCellTemplateComponent<T>> {
  return { type: IxCellTemplateComponent, ...options };
}
