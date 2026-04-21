import { AfterViewInit, Directive, ElementRef, HostBinding, inject } from '@angular/core';

@Directive({
  selector: '[appScrollToMessage]',
  standalone: true,
  host: {
    tabindex: '-1'
  }
})
export class ScrollToMessageDirective implements AfterViewInit {
  private elementRef = inject(ElementRef<HTMLElement>);

  @HostBinding('style.scroll-margin-top.px')
  scrollMarginTop = 96;

  ngAfterViewInit(): void {
    setTimeout(() => {
      const element = this.elementRef.nativeElement;

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      element.focus({ preventScroll: true });
    });
  }
}