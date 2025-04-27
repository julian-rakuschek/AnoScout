import { Anomaly, ToastType } from "../../../types";
import { Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAtom } from "jotai/index";
import { hoveringAnomalyAtom, selectedAnomalyAtom, selectedNominalAtom } from "lib/atoms";
import { useAnomaly, useBucketAlgorithms, useTimeSeries } from "lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toastAtom } from "lib/atoms";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useRef, useState } from "react";
import { BookmarkIcon as BookmarkIconOutline } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkIconSolid } from "@heroicons/react/24/solid";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import useOnScreen from "lib/helper/util";
import { useIdsContext } from "lib/IdsContext";
import RatingSlider from "components/atoms/RatingSlider";
import AnomalyLocation from "components/atoms/AnomalyLocation";
import { AutoSizer } from "react-virtualized";
import { AnomalyScoreHeatmap } from "components/molecules/Charts/AnomalyScoreHeatmap";

export enum AnomalyCardType {
  INSPECT,
  RECOMMENDER
}

type AnomalyCardProps = {
  AID: string;
  cardType: AnomalyCardType;
  active?: boolean;
  compact?: boolean;
  color?: string;
  hideLocationIndicator?: boolean;
};

export default function AnomalyCard({ AID, cardType, active, compact, color, hideLocationIndicator }: AnomalyCardProps): JSX.Element {
  const { bucketId } = useIdsContext();
  const [hovering, setHovering] = useAtom(hoveringAnomalyAtom);
  const [openRating, setOpenRating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const anomaly = useAnomaly(AID, 0, visible && (active ?? true));
  const queryClient = useQueryClient();
  const [toast, setToast] = useAtom(toastAtom);
  const [selectedAnomaly, setSelectedAnomaly] = useAtom(selectedAnomalyAtom);
  const [selectedNominal, setSelectedNominal] = useAtom(selectedNominalAtom);
  const selected = selectedAnomaly === AID;
  const algorithms = useBucketAlgorithms(bucketId!);
  const scores_per_algo: { name: string; scores: number[] }[] = anomaly ? algorithms.filter(a => a.type === "scoring").map(a => ({
    name: a.name,
    scores: anomaly.ts_data?.map(d => d.scores[a._id.$oid]) ?? [],
  })) : [];

  const handleDelete = async (): Promise<void> => {
    if(selected) setSelectedAnomaly("");
    const res = await ApiRoutes.deleteAnomaly.fetch({ params: { AID } });
    if(res.success) setToast({ message: "Anomaly deleted!", type: ToastType.Success });
    else setToast({ message: "Could not delete anomaly!", type: ToastType.Error });
    await queryClient.invalidateQueries();
  };

  const updateRating = async (new_rating: number): Promise<void> => {
    if(!anomaly) return;
    await ApiRoutes.updateAnomaly.fetch({ data: { rating: new_rating, keep: new_rating !== 0 || anomaly.bookmark }, params: { AID } });
    await queryClient.invalidateQueries({ queryKey: [`/anomalies/anomaly/${AID}?extension=0&`] });
    await queryClient.invalidateQueries({ queryKey: [`/anomalies/recommender/collab/${bucketId}`] });
    await queryClient.invalidateQueries({ queryKey: [`/anomalies/recommender/severities/${bucketId}`] });
    await queryClient.invalidateQueries({ queryKey: [`/anomalies/ratings/${bucketId}`] });
    await queryClient.invalidateQueries({ queryKey: [`/anomalies/bucket/${bucketId}?include_ts_data=false&only_manual=false&only_bookmarked=false&`] });
  };

  const updateBookmark = async (bookmarked: boolean): Promise<void> => {
    if(!anomaly) return;
    await ApiRoutes.updateAnomaly.fetch({ data: { bookmark: bookmarked, keep: bookmarked || anomaly.rating !== 0 }, params: { AID } });
    await queryClient.invalidateQueries({ queryKey: [`/anomalies/anomaly/${AID}?extension=0&`] });
  };

  const setSelected = async (): Promise<void> => {
    if(selected) setSelectedAnomaly("");
    else setSelectedAnomaly(AID);
    setSelectedNominal("");
    await ApiRoutes.increaseViewcount.fetch({ params: { AID } });
  };

  return (
    <div className="w-full h-full relative" ref={ref}>
      {anomaly && <>
        <div
          className={`w-full h-full ${compact ? "px-2 pt-10" : "px-5 pt-16 "}  py-2 shadow-lg transition flex flex-col border-2 border-transparent cursor-default hover:border-2 hover:border-indigo-700 rounded-lg ${selected ? "bg-indigo-700 text-white" : "bg-white text-gray-700"}`}
          onClick={() => setSelected()} onMouseOver={() => setHovering(AID)} onMouseOut={() => setHovering("")}>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={anomaly.ts_data}>
              <XAxis dataKey="timestamp_string" hide={true} angle={-45} tick={false} stroke={selected ? "white" : "black"}/>
              <YAxis domain={["auto", "auto"]} hide={true} type="number" allowDataOverflow yAxisId="1" stroke={selected ? "white" : "black"}/>
              <Line type="monotone" dataKey={`value`} stroke={selected ? "white" : "black"} dot={false} isAnimationActive={false} yAxisId="1"/>,
            </LineChart>
          </ResponsiveContainer>
          {!hideLocationIndicator && <p className="text-sm">Location in {anomaly.timeSeriesName} ({anomaly.channel}):</p>}
          {hideLocationIndicator && compact && <p className="text-sm text-center">{anomaly.timeSeriesName}</p>}
          {!hideLocationIndicator && <div className="w-full mb-2">
            <AutoSizer>
              {({ height, width }) => (
                <AnomalyLocation AID={anomaly._id.$oid} color={color ?? "indigo"} height={5} width={width}/>
              )}
            </AutoSizer>
          </div>}
          {!hideLocationIndicator && <div className={"w-full mb-2"}>
            {scores_per_algo.map(s => <div className={"w-full flex flex-row h-5 items-center gap-2"}>
              <p className="text-xs text-center">{s.name}</p>
              <AnomalyScoreHeatmap scores={s.scores} min={0} max={1} manualHeight={8} mixWithAlpha={true} />
            </div>)}
          </div>}
          {!compact && <div className="w-full text-sm">
            {cardType === AnomalyCardType.RECOMMENDER && anomaly.timeSeriesName && <p><span className="font-semibold">Timeseries: </span>{anomaly.timeSeriesName}</p>}
            <p><span className="font-semibold">Channel: </span>{anomaly.channel}</p>
            <p className="inline"><span className="font-semibold">Start: </span>{anomaly.start.$date}</p>
            <p><span className="font-semibold">End: </span>{anomaly.end.$date}</p>
            <p className="inline"><span className="font-semibold">Score: </span>{Math.round(anomaly.score * 1000) / 1000}</p>
            <p><span className="font-semibold">Length: </span>{anomaly.length}</p>
          </div>}
        </div>
        {anomaly.manual && <div className="w-full flex flex-row justify-center items-center absolute bottom-3">
          <div className="border-solid border-[1px] border-red-500 rounded-full px-3 text-red-500 cursor-default bg-white transition hover:bg-red-500 hover:text-white" onClick={() => handleDelete()}>Delete</div>
        </div>}
        <div className={`w-full ${compact ? "pl-2 pr-2" : "px-5"} absolute top-3 cursor-default`} onClick={() => setOpenRating(!openRating)}>
          <RatingSlider selected={selected} initRating={anomaly.rating} updateRating={updateRating} compact={compact}/>
        </div>
      </>}
      {!anomaly && <CenteredLoadingSpinner/>}
    </div>
  );
}