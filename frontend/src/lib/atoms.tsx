import { atom } from "jotai";
import { SegmentProjected, TimeSeriesClusterSemanticZoomState, ToastDto, ToastType } from "../types";

export const toastAtom = atom<ToastDto>({ type: ToastType.Info, message: "" });
export const hoveringAnomalyAtom = atom<string>("");
export const selectedAnomalyAtom = atom<string>("");
export const selectedNominalAtom = atom<string>("");
export const segmentHoverAtom = atom<SegmentProjected | undefined>(undefined);
export const somSemanticZoomAtom = atom<TimeSeriesClusterSemanticZoomState>({ lineChartInteractive: true, lineChartFontSize: 13, horizonBands: 5, heatmapCellsX: 10, heatmapCellsY: 5 });
export const timeSeriesPopupAtom = atom<string | undefined>(undefined);