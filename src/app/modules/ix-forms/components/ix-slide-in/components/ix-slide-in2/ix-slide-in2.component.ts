import { Location } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { UUID } from 'angular2-uuid';
import { Observable, Subscription, filter, merge, timer } from 'rxjs';
import { IxSlideInRef } from 'app/modules/ix-forms/components/ix-slide-in/ix-slide-in-ref';
import { SLIDE_IN_DATA } from 'app/modules/ix-forms/components/ix-slide-in/ix-slide-in.token';
import { IxChainedSlideInService } from 'app/services/ix-chained-slide-in.service';

@UntilDestroy()
@Component({
  selector: 'ix-slide-in2',
  templateUrl: './ix-slide-in2.component.html',
  styleUrls: ['./ix-slide-in2.component.scss'],
})
export class IxSlideIn2Component implements OnInit, OnDestroy {
  @Input() id: string;
  @Input() index: number;
  @Input() componentType: Type<unknown>;
  @ViewChild('body', { static: true, read: ViewContainerRef }) slideInBody: ViewContainerRef;

  @HostListener('document:keydown.escape') onKeydownHandler(): void {
    this.onBackdropClicked();
  }

  slideInRef: IxSlideInRef<unknown>;

  isSlideInOpen = false;
  wide = false;
  private element: HTMLElement;
  private wasBodyCleared = false;
  private timeOutOfClear: Subscription;
  counterId = 0;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private location: Location,
    private router: Router,
    private chainedSlideInService: IxChainedSlideInService,
  ) {
    this.closeOnNavigation();
    this.element = this.el.nativeElement as HTMLElement;
  }

  ngOnInit(): void {
    // ensure id attribute exists
    if (!this.id) {
      return;
    }

    // move element to bottom of page (just before </body>) so it can be displayed above everything else
    document.body.appendChild(this.element);
    if (this.componentType) {
      this.open(this.componentType);
    }
  }

  onBackdropClicked(): void {
    if (!this.element || !this.isSlideInOpen) { return; }
    this.chainedSlideInService.popComponent();
  }

  closeSlideIn(): void {
    this.renderer.removeStyle(document.body, 'overflow');
    this.wasBodyCleared = true;
    this.timeOutOfClear = timer(200).pipe(untilDestroyed(this)).subscribe(() => {
      // Destroying child component later improves performance a little bit.
      // 200ms matches transition duration
      this.slideInBody.clear();
      this.wasBodyCleared = false;
    });
  }

  open<T, D>(component: Type<T>, params?: { wide?: boolean; data?: D }): void {
    this.slideInRef = this.openSlideIn(component, params);
  }

  openSlideIn<T, D>(
    componentType: Type<T>,
    params?: { wide?: boolean; data?: D },
  ): IxSlideInRef<T, D> {
    if (this.isSlideInOpen) {
      console.error('SlideIn is already open');
    }

    this.isSlideInOpen = true;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    this.wide = !!params?.wide;

    if (this.wasBodyCleared) {
      this.timeOutOfClear.unsubscribe();
    }
    this.slideInBody.clear();
    this.wasBodyCleared = false;
    // clear body and close all slides

    return this.createSlideInRef<T, D>(componentType, params?.data);
  }

  private createSlideInRef<T, D>(
    componentType: Type<T>,
    data?: D,
  ): IxSlideInRef<T, D> {
    const slideInRef = new IxSlideInRef<T, D>();
    const injector = Injector.create({
      providers: [
        { provide: SLIDE_IN_DATA, useValue: data },
        { provide: IxSlideInRef, useValue: slideInRef },
      ],
    });
    slideInRef.componentRef = this.slideInBody.createComponent<T>(componentType, { injector });
    slideInRef.id = UUID.UUID();

    return slideInRef;
  }

  ngOnDestroy(): void {
    this.element.remove();
    this.slideInRef.close();
  }
  private closeOnNavigation(): void {
    merge(
      new Observable((observer) => {
        this.location.subscribe((event) => {
          observer.next(event);
        });
      }),
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    )
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        this.slideInRef.close();
      });
  }
}
