import AnomalyCard, { AnomalyCardType } from "components/molecules/Cards/AnomalyCard";
import { useEffect, useState } from "react";
import { classNames } from "lib/helper/util";
import { Anomaly, Nominal } from "../../../types";
import Pagination from "components/atoms/Pagination";
import NominalCard from "components/molecules/Cards/NominalCard";

const enum tabs {
  ANOMALY,
  NOMINAL
}

export default function AnomalyListTimeseries({ anomalies, nominals, items_per_page, hideTabs }: { anomalies: Anomaly[]; nominals: Nominal[]; items_per_page: number; hideTabs?: boolean }): JSX.Element {
  const [currentPage, setPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState(tabs.ANOMALY);
  const pagesCountAnomalies = Math.ceil(anomalies.length / items_per_page);
  const pagesCountNominals = Math.ceil(nominals.length / items_per_page);
  const indexInPage = (index: number): boolean => {
    return index >= (currentPage - 1) * items_per_page && index < currentPage * items_per_page;
  };

  useEffect(() => {
    setPage(1);
  }, [selectedTab]);

  useEffect(() => {
    if(selectedTab === tabs.ANOMALY && currentPage > pagesCountAnomalies) setPage(pagesCountAnomalies);
    else if(selectedTab === tabs.NOMINAL && currentPage > pagesCountNominals) setPage(pagesCountNominals);
    else setPage(1);
  }, [pagesCountAnomalies, pagesCountNominals]);

  return (
    <>
      {!hideTabs && <div className="w-full flex space-x-4">
        <div className={classNames(
          selectedTab === tabs.ANOMALY ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700',
          'rounded-md px-3 py-2 text-sm font-medium cursor-default'
        )} onClick={() => setSelectedTab(tabs.ANOMALY)}>Anomalies
        </div>
        <div className={classNames(
          selectedTab === tabs.NOMINAL ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:text-gray-700',
          'rounded-md px-3 py-2 text-sm font-medium cursor-default'
        )} onClick={() => setSelectedTab(tabs.NOMINAL)}>Nominals
        </div>
      </div>}
      {selectedTab === tabs.ANOMALY &&
      <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {anomalies.map((anomaly, index) =>
          indexInPage(index) ? <AnomalyCard cardType={AnomalyCardType.INSPECT} AID={anomaly._id.$oid} key={anomaly._id.$oid} /> : null,
        )}
      </div> }
      {selectedTab === tabs.NOMINAL &&
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {nominals.map((nominal, index) =>
          indexInPage(index) ? <NominalCard nominal={nominal} key={nominal._id.$oid}/> : null,
        )}
      </div> }
      <div className="w-full pt-5">
        <Pagination currentPage={currentPage} pagesCount={selectedTab === tabs.ANOMALY ? pagesCountAnomalies : pagesCountNominals} setPage={setPage}/>
      </div>
    </>
  );
}