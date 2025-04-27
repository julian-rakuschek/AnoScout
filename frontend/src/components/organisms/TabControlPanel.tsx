import { Bucket, Tabs, TimeSeries } from "../../types";
import UploadMenu from "components/molecules/Management/UploadMenu";
import EnqueueButton from "components/molecules/Management/EnqueueButton";
import AnomalyExtractionPopup from "components/organisms/Popups/AnomalyExtractionPopup";
import { PlayIcon } from "@heroicons/react/24/solid";
import { classNames } from "lib/helper/util";
import AlgorithmPopup from "components/organisms/Popups/AlgorithmPopup";

export default function TabControlPanel({ bucket, timeSeriesList, tab, setTab }: {bucket: Bucket; timeSeriesList: TimeSeries[]; tab: Tabs; setTab: (t: Tabs) => void }): JSX.Element {
  return (
    <div className="flex flex-row justify-between px-2 gap-10">
      <div className="flex flex-row flex-nowrap gap-2 items-center justify-start h-full">
        <UploadMenu bucket={bucket}/>
        <PlayIcon className="w-5 h-5 text-indigo-600" />
        <AlgorithmPopup bucket={bucket} />
        <PlayIcon className="w-5 h-5 text-indigo-600" />
        <EnqueueButton bucket={bucket} />
        <PlayIcon className="w-5 h-5 text-indigo-600" />
        <AnomalyExtractionPopup bucket={bucket} timeSeriesList={timeSeriesList}/>
      </div>
      <div className="flex items-center justify-center grow">
        <nav className="flex divide-x divide-gray-200 rounded-lg shadow-sm w-full" aria-label="Tabs">
          <div
            onClick={() => setTab(Tabs.TS_LIST)}
            className={classNames(
              tab === Tabs.TS_LIST ? "text-gray-900" : "text-gray-500 hover:text-gray-700",
              "rounded-l-lg",
              "group relative min-w-0 flex-1 overflow-hidden bg-white py-2 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10 cursor-default",
            )}
            aria-current={tab === Tabs.TS_LIST ? "page" : undefined}
          >
            <span>Time Series List</span>
            <span
              aria-hidden="true"
              className={classNames(
                tab === Tabs.TS_LIST ? "bg-indigo-500" : "bg-transparent",
                "absolute inset-x-0 bottom-0 h-0.5",
              )}
            />
          </div>
          <div
            onClick={() => setTab(Tabs.TS_CLUSTER)}
            className={classNames(
              tab === Tabs.TS_CLUSTER ? "text-gray-900" : "text-gray-500 hover:text-gray-700",
              bucket.type === "scoring" ? "rounded-r-lg" : "",
              "group relative min-w-0 flex-1 overflow-hidden bg-white py-2 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10 cursor-default",
            )}
            aria-current={tab === Tabs.TS_CLUSTER ? "page" : undefined}
          >
            <span>Time Series Cluster</span>
            <span
              aria-hidden="true"
              className={classNames(
                tab === Tabs.TS_CLUSTER ? "bg-indigo-500" : "bg-transparent",
                "absolute inset-x-0 bottom-0 h-0.5",
              )}
            />
          </div>
          {bucket.type === "classification" && <div
            onClick={() => setTab(Tabs.ALGOVIS)}
            className={classNames(
              tab === Tabs.ALGOVIS ? "text-gray-900" : "text-gray-500 hover:text-gray-700",
              "rounded-r-lg",
              "group relative min-w-0 flex-1 overflow-hidden bg-white py-2 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10 cursor-default",
            )}
            aria-current={tab === Tabs.ALGOVIS ? "page" : undefined}
          >
            <span>Algorithm Visualization</span>
            <span
              aria-hidden="true"
              className={classNames(
                tab === Tabs.ALGOVIS ? "bg-indigo-500" : "bg-transparent",
                "absolute inset-x-0 bottom-0 h-0.5",
              )}
            />
          </div>}
          <div
            onClick={() => setTab(Tabs.ANOMALY_LIST)}
            className={classNames(
              tab === Tabs.ANOMALY_LIST ? "text-gray-900" : "text-gray-500 hover:text-gray-700",
              bucket.type === "scoring" ? "rounded-r-lg" : "",
              "group relative min-w-0 flex-1 overflow-hidden bg-white py-2 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10 cursor-default",
            )}
            aria-current={tab === Tabs.ANOMALY_LIST ? "page" : undefined}
          >
            <span>Anomaly List</span>
            <span
              aria-hidden="true"
              className={classNames(
                tab === Tabs.ANOMALY_LIST ? "bg-indigo-500" : "bg-transparent",
                "absolute inset-x-0 bottom-0 h-0.5",
              )}
            />
          </div>
          <div
            onClick={() => setTab(Tabs.ANOMALY_CLUSTER)}
            className={classNames(
              tab === Tabs.ANOMALY_CLUSTER ? "text-gray-900" : "text-gray-500 hover:text-gray-700",
              bucket.type === "scoring" ? "rounded-r-lg" : "",
              "group relative min-w-0 flex-1 overflow-hidden bg-white py-2 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10 cursor-default",
            )}
            aria-current={tab === Tabs.ANOMALY_CLUSTER ? "page" : undefined}
          >
            <span>Anomaly Cluster</span>
            <span
              aria-hidden="true"
              className={classNames(
                tab === Tabs.ANOMALY_CLUSTER ? "bg-indigo-500" : "bg-transparent",
                "absolute inset-x-0 bottom-0 h-0.5",
              )}
            />
          </div>
        </nav>
      </div>
    </div>
  );
}