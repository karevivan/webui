import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloudsyncWizardComponent } from './cloudsync-wizard.component';

describe('CloudsyncWizardComponent', () => {
  let component: CloudsyncWizardComponent;
  let fixture: ComponentFixture<CloudsyncWizardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CloudsyncWizardComponent]
    });
    fixture = TestBed.createComponent(CloudsyncWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
