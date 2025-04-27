import { Bucket, TimeSeries, TimeSeriesInteractionMode, ToastType } from "../../../types";
import React, { useEffect, useState } from "react";
import ChannelSelection from "components/atoms/ChannelSelection";
import TimeSeriesChart from "components/molecules/TimeSeries/TimeSeriesChart";
import AnomalyScores, { SCORE_DISPLAY } from "components/molecules/TimeSeries/AnomalyScores";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useSetAtom } from "jotai/index";
import { toastAtom } from "lib/atoms";
import { useQueryClient } from "@tanstack/react-query";
import EnsemblePostProcessing from "components/molecules/Management/EnsemblePostProcessing";
import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import AnomalyClassifications from "components/molecules/TimeSeries/AnomalyClassifications";
import Select, { SingleValue } from "react-select";

export default function AnomalyExtraction({ bucket, timeSeriesList }: { bucket: Bucket; timeSeriesList: TimeSeries[] }): JSX.Element {
  const tsListOptions = timeSeriesList.map(t => ({ value: t._id.$oid, label: t.name }));
  const [timeSeries, setTimeSeries] = useState<TimeSeries>(timeSeriesList[0]);
  const [selectedChannel, setSelectedChannel] = useState<string>(timeSeries.channels[0]);
  const setToast = useSetAtom(toastAtom);
  const queryClient = useQueryClient();
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    setIsExtracting(false);
  }, []);

  useEffect(() => {
    setSelectedChannel(timeSeries.channels[0]);
  }, [timeSeries]);

  const extractAnomalies = async (resetRatings: boolean): Promise<void> => {
    if(resetRatings) {
      await ApiRoutes.resetRatings.fetch({ params: { BID: bucket._id.$oid } });
    }
    setIsExtracting(true);
    const res = await ApiRoutes.extractAnomalies.fetch({ params: { BID: bucket._id.$oid } });
    if(res.success) setToast({ message: "Extraction successful!", type: ToastType.Success });
    else setToast({ message: "Extraction failed!", type: ToastType.Error });
    setIsExtracting(false);
    await queryClient.invalidateQueries();
  };

  return <div className="flex flex-col gap-y-4">
    <div className="flex flex-row justify-between items-center">
      <div className="w-1/2">
        <Select
          closeMenuOnSelect={true}
          isMulti={false}
          options={tsListOptions}
          value={tsListOptions.filter(option => timeSeries._id.$oid === option.value)}
          onChange={new_options => setTimeSeries(timeSeriesList.find(t => t._id.$oid === new_options?.value) ?? timeSeriesList[0])}
          isSearchable={false}
        />
      </div>
      <ChannelSelection selectableChannels={timeSeries.channels} selectedChannel={selectedChannel} setSelectedChannel={setSelectedChannel}/>
    </div>
    <div className="w-full h-[300px]">
      <TimeSeriesChart bucket={bucket} timeSeries={timeSeries} selectedChannel={selectedChannel} interactionMode={TimeSeriesInteractionMode.NONE}/>
    </div>
    {bucket.type === "classification" && <div className="w-full">
      <AnomalyClassifications canEdit={true} bucket={bucket} timeSeries={timeSeries} selectedChannel={selectedChannel}/>
    </div>}
    {bucket.type === "scoring" && <>
      <div className="w-full">
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className={`py-2 w-full rounded-lg flex flex-row justify-between px-4 bg-indigo-700`}>
                <p className="font-semibold text-white">Algorithm Weights</p>
                {open && <ChevronUpIcon className="h-5 w-5 text-white"/>}
                {!open && <ChevronDownIcon className="h-5 w-5 text-white"/>}
              </Disclosure.Button>
              <Disclosure.Panel className="text-gray-700 rounded-xl border-[4px] border-indigo-700 mt-4 p-4">
                <p className="font-semibold text-black">Weighted average of algorithm scores:</p>
                <AnomalyScores
                  bucket={bucket}
                  timeSeries={timeSeries}
                  displayOption={SCORE_DISPLAY.AVG_AND_SCORES_MULTI_PlOT}
                  readOnly={false}
                  selectedChannel={selectedChannel}
                />
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
      </div>
      <div className="w-full">
        <EnsemblePostProcessing bucket={bucket}/>
      </div>
      <div className="w-full">
        <AnomalyScores
          bucket={bucket}
          timeSeries={timeSeries}
          displayOption={SCORE_DISPLAY.ONLY_POST}
          readOnly={true}
          selectedChannel={selectedChannel}
        />
      </div>
    </>}
    {!isExtracting &&
      <div className="flex justify-center mb-10 gap-x-10">
        <button className="bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 font-semibold p-3" onClick={() => extractAnomalies(false)}>Extract Anomalies</button>
        <button className="bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold p-3" onClick={() => extractAnomalies(true)}>Reset Ratings and Extract Anomalies</button>
      </div>
    }
    {isExtracting &&
      <div className="flex flex-col justify-center mb-10 gap-y-5">
        Extracting anomalies ...
        <CenteredLoadingSpinner/>
      </div>
    }
  </div>;
}