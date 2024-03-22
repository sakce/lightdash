import {
    FieldType,
    formatItemValue,
    friendlyName,
    isField,
    MetricType,
    type ApiQueryResults,
    type ItemsMap,
    type ResultRow,
} from '@lightdash/common';
import { type Row } from '@tanstack/react-table';
import {
    TableHeaderBoldLabel,
    TableHeaderLabelContainer,
    TableHeaderRegularLabel,
} from '../../components/common/Table/Table.styles';
import {
    columnHelper,
    type TableColumn,
    type TableHeader,
} from '../../components/common/Table/types';

type Args = {
    itemsMap: ItemsMap;
    selectedItemIds: string[];
    resultsData: ApiQueryResults;
    isColumnVisible: (key: string) => boolean;
    isColumnFrozen: (key: string) => boolean;
    showTableNames: boolean;
    getFieldLabelOverride: (key: string) => string | undefined;
    columnOrder: string[];
    totals?: Record<string, number>;
};

// Adapted from https://stackoverflow.com/a/45337588
const decimalLength = (numStr: number) => {
    const pieces = numStr.toString().split('.');
    if (!pieces[1]) return 0;
    return pieces[1].length;
};
const getDecimalPrecision = (addend1: number, addend2: number) =>
    Math.pow(10, Math.max(decimalLength(addend1), decimalLength(addend2)));

const getDataAndColumns = ({
    itemsMap,
    selectedItemIds,
    resultsData,
    isColumnVisible,
    isColumnFrozen,
    showTableNames,
    getFieldLabelOverride,
    columnOrder,
    totals,
}: Args): {
    rows: ResultRow[];
    columns: Array<TableHeader | TableColumn>;
    error?: string;
} => {
    const columns = selectedItemIds.reduce<Array<TableHeader | TableColumn>>(
        (acc, itemId) => {
            const item = itemsMap[itemId] as
                | typeof itemsMap[number]
                | undefined;

            if (!columnOrder.includes(itemId)) {
                return acc;
            }
            const headerOverride = getFieldLabelOverride(itemId);

            const shouldAggregate =
                item &&
                isField(item) &&
                item.fieldType === FieldType.METRIC &&
                [
                    MetricType.SUM.toString(),
                    MetricType.COUNT.toString(),
                ].includes(item.type);
            const aggregationFunction = shouldAggregate
                ? (
                      columnId: string,
                      _leafRows: Row<ResultRow>[],
                      childRows: Row<ResultRow>[],
                  ) => {
                      let aggregatedValue = 0;
                      const allNumberValues = childRows.some((childRow) => {
                          const valueObj = childRow.getValue(columnId);
                          const val =
                              typeof valueObj === 'object' &&
                              valueObj &&
                              'value' in valueObj
                                  ? valueObj.value
                                  : null;
                          const raw =
                              typeof val === 'object' && val && 'raw' in val
                                  ? val.raw
                                  : null;
                          if (raw === null)
                              return false;
                          const adder = Number(raw);
                          if (isNaN(adder))
                              return false;
                          const precision = getDecimalPrecision(adder, aggregatedValue);
                          const result = (aggregatedValue * precision + adder * precision) / precision;
                          aggregatedValue = result;
                          return true;
                      });
                      return <b>{formatItemValue(item, allNumberValues ? aggregatedValue : '')}</b>;
                  }
                : undefined;

            const column: TableHeader | TableColumn = columnHelper.accessor(
                (row) => row[itemId],
                {
                    id: itemId,
                    header: () => (
                        <TableHeaderLabelContainer>
                            {!!headerOverride ? (
                                <TableHeaderBoldLabel>
                                    {headerOverride}
                                </TableHeaderBoldLabel>
                            ) : isField(item) ? (
                                <>
                                    {showTableNames && (
                                        <TableHeaderRegularLabel>
                                            {item.tableLabel}{' '}
                                        </TableHeaderRegularLabel>
                                    )}

                                    <TableHeaderBoldLabel>
                                        {item.label}
                                    </TableHeaderBoldLabel>
                                </>
                            ) : (
                                <TableHeaderBoldLabel>
                                    {item === undefined
                                        ? 'Undefined'
                                        : 'displayName' in item
                                        ? item.displayName
                                        : friendlyName(item.name)}
                                </TableHeaderBoldLabel>
                            )}
                        </TableHeaderLabelContainer>
                    ),
                    cell: (info: any) =>
                        info.getValue()?.value.formatted || '-',

                    footer: () =>
                        totals?.[itemId]
                            ? formatItemValue(item, totals[itemId])
                            : null,
                    meta: {
                        item,
                        isVisible: isColumnVisible(itemId),
                        frozen: isColumnFrozen(itemId),
                    },

                    // Some features work in the TanStack Table demos but not here, for unknown reasons.
                    // For example, setting grouping value here does not work. The workaround is to use
                    // a custom getGroupedRowModel.
                    // getGroupingValue: (row) => { // Never gets called.
                    //     const value = row[itemId]?.value.raw;
                    //     return value === null || value === undefined ? 'null' : value;
                    // },
                    // aggregationFn: 'sum', // Not working.
                    // aggregationFn: 'max', // At least results in a cell value, although it's incorrect.

                    aggregationFn: aggregationFunction,
                    aggregatedCell: (info) => {
                        const value = info.getValue();
                        const ret = value ?? info.cell.getValue();
                        const numVal = Number(ret);
                        return isNaN(numVal) ? ret : numVal;
                    },
                },
            );
            return [...acc, column];
        },
        [],
    );
    return {
        rows: resultsData.rows,
        columns,
    };
};

export default getDataAndColumns;
