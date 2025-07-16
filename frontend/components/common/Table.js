"use client";

import { Loading } from "@/components/common/Loading";
import { Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { SearchBar } from "./SearchBar";
import styles from "./Table.module.css";

export const Table = ({
  columns: columnsFromProps,
  columnsWithRefetch,
  fetchData: fetchDataFunc,
  pageTitle,
  emptyMessage,
  headerComp,
  formatDataFunc,
}) => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState();
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 2,
  });

  const fetchData = async (targetPage) => {
    setLoading(true);
    const params = getSearchParams(targetPage);

    const { data: responseData, total } = await fetchDataFunc(params);
    const formattedData = formatDataFunc
      ? formatDataFunc(responseData)
      : responseData;
    setData(formattedData);
    setTotal(total);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [paginationModel.page, paginationModel.pageSize]);

  const getSearchParams = (targetPage) => {
    const params = {
      page: targetPage ?? paginationModel.page,
      pageSize: paginationModel.pageSize
    };
    if (searchText?.length) {
      params.searchText = searchText;
    }
    return params;
  };

  if (loading) {
    return <Loading />;
  }

  const handleSearch = () => {
    fetchData(0);
  };

  const columns = (() => {
    if (columnsWithRefetch) {
      const col = columnsWithRefetch({ refetch: () => fetchData(0) });

      return col;
    }
    return columnsFromProps;
  })();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div>
          <Typography variant="h2">{pageTitle}</Typography>
        </div>
        <div className={styles.searchContainer}>
          <SearchBar
            handleSearch={handleSearch}
            searchText={searchText}
            setSearchText={setSearchText}
          />
        </div>
      </div>
      <div className={styles.headerCompContainer}>
        {headerComp && headerComp({ refetch: () => fetchData(0) })}
      </div>
      <div className={styles.tableContainer}>
        {data.length > 0 && (
          <DataGrid
            rows={data}
            columns={columns}
            rowCount={total}
            autoPageSize
            loading={loading}
            disableColumnMenu
            disableColumnSorting
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
          />
        )}
        {data.length === 0 && (
          <Typography variant="h6">{emptyMessage}</Typography>
        )}
      </div>
    </div>
  );
};
