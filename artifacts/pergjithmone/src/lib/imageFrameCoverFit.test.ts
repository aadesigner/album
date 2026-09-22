import { describe, it, expect } from 'vitest';
import { imageFrameCoverFit, imageFrameFocusFromOffset, PHOTO_CORNER_ZOOM, minPhotoAdjustZoom } from './designs';

describe('imageFrameCoverFit', () => {
  it('landscape photo in square frame can pan horizontally only', () => {
    const fit = imageFrameCoverFit(2000, 1000, 400, 400, 0.5, 0.5);
    expect(fit.canPan).toBe(true);
    expect(fit.maxOffY).toBe(0);
    expect(fit.maxOffX).toBeGreaterThan(1);
    expect(fit.ih).toBeCloseTo(400);
    expect(fit.offX).toBeCloseTo(fit.maxOffX * 0.5);
  });

  it('portrait photo in landscape frame can pan vertically', () => {
    const fit = imageFrameCoverFit(800, 1600, 600, 300, 0.25, 0.75);
    expect(fit.canPan).toBe(true);
    expect(fit.maxOffX).toBe(0);
    expect(fit.maxOffY).toBeGreaterThan(1);
    expect(fit.offY).toBeCloseTo(fit.maxOffY * 0.75);
  });

  it('exact aspect match cannot pan', () => {
    const fit = imageFrameCoverFit(1000, 800, 500, 400, 0.5, 0.5);
    expect(fit.canPan).toBe(false);
    expect(fit.maxOffX).toBe(0);
    expect(fit.maxOffY).toBe(0);
    expect(fit.iw).toBeCloseTo(500);
    expect(fit.ih).toBeCloseTo(400);
  });

  it('clamps focus to 0–1', () => {
    const lo = imageFrameCoverFit(2000, 1000, 400, 400, -2, -2);
    const hi = imageFrameCoverFit(2000, 1000, 400, 400, 3, 3);
    expect(lo.offX).toBe(0);
    expect(lo.offY).toBe(0);
    expect(hi.offX).toBeCloseTo(hi.maxOffX);
    expect(hi.offY).toBeCloseTo(hi.maxOffY);
  });

  it('corner zoom unlocks 2D pan on landscape-in-square', () => {
    const fit = imageFrameCoverFit(2000, 1000, 400, 400, 0, 0, PHOTO_CORNER_ZOOM);
    expect(fit.maxOffX).toBeGreaterThan(1);
    expect(fit.maxOffY).toBeGreaterThan(1);
    expect(fit.offX).toBe(0);
    expect(fit.offY).toBe(0);
    const corner = imageFrameCoverFit(2000, 1000, 400, 400, 1, 1, PHOTO_CORNER_ZOOM);
    expect(corner.offX).toBeCloseTo(corner.maxOffX);
    expect(corner.offY).toBeCloseTo(corner.maxOffY);
  });

  it('corner zoom unlocks 2D pan on exact-aspect frames', () => {
    const fit = imageFrameCoverFit(1000, 800, 500, 400, 0.5, 0.5, PHOTO_CORNER_ZOOM);
    expect(fit.canPan).toBe(true);
    expect(fit.maxOffX).toBeGreaterThan(1);
    expect(fit.maxOffY).toBeGreaterThan(1);
  });
});

describe('minPhotoAdjustZoom', () => {
  it('stays at corner zoom for large frames', () => {
    expect(minPhotoAdjustZoom(2000, 1500, 600, 800)).toBeCloseTo(PHOTO_CORNER_ZOOM);
  });

  it('raises zoom for very small frames so pan travel is usable', () => {
    const z = minPhotoAdjustZoom(1000, 1000, 120, 120);
    expect(z).toBeGreaterThan(PHOTO_CORNER_ZOOM);
    const fit = imageFrameCoverFit(1000, 1000, 120, 120, 0.5, 0.5, z);
    expect(fit.maxOffX).toBeGreaterThanOrEqual(40);
    expect(fit.maxOffY).toBeGreaterThanOrEqual(40);
  });
});

describe('imageFrameFocusFromOffset', () => {
  it('round-trips focus through drag offsets', () => {
    const fit = imageFrameCoverFit(2000, 1000, 400, 400, 0.2, 0.5);
    const next = imageFrameFocusFromOffset(-fit.offX, -fit.offY, fit.maxOffX, fit.maxOffY);
    expect(next.cropFocusX).toBeCloseTo(0.2);
    expect(next.cropFocusY).toBe(0.5);
    expect(next.x).toBeCloseTo(-fit.offX);
  });

  it('clamps out-of-bounds drags', () => {
    const next = imageFrameFocusFromOffset(50, -9999, 100, 200);
    expect(next.x).toBe(0);
    expect(next.y).toBe(-200);
    expect(next.cropFocusX).toBe(0);
    expect(next.cropFocusY).toBe(1);
  });

  it('exact-fit frames report center focus', () => {
    const next = imageFrameFocusFromOffset(0, 0, 0, 0);
    expect(next.cropFocusX).toBe(0.5);
    expect(next.cropFocusY).toBe(0.5);
  });
});
