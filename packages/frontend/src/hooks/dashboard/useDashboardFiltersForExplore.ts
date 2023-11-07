import {
    DashboardFilters,
    Explore,
    getDashboardFilterRulesForTileAndTables,
} from '@lightdash/common';
import { useMemo } from 'react';
import { useDashboardContext } from '../../providers/DashboardProvider';

const useDashboardFiltersForExplore = (
    tileUuid: string,
    explore: Explore | undefined,
): DashboardFilters => {
    const { dashboardFilters, dashboardTemporaryFilters } =
        useDashboardContext();

    const tables = useMemo(
        () => (explore ? Object.keys(explore.tables) : []),
        [explore],
    );

    return useMemo(
        () => ({
            dimensions: getDashboardFilterRulesForTileAndTables(
                tileUuid,
                tables,
                [
                    ...dashboardFilters.dimensions,
                    ...(dashboardTemporaryFilters?.dimensions ?? []),
                ],
            ),
            metrics: getDashboardFilterRulesForTileAndTables(tileUuid, tables, [
                ...dashboardFilters.metrics,
                ...(dashboardTemporaryFilters?.metrics ?? []),
            ]),
            tableCalculations: getDashboardFilterRulesForTile(
                tileUuid,
                tables,
                [
                    ...dashboardFilters.tableCalculations,
                    ...(dashboardTemporaryFilters?.tableCalculations ?? []),
                ],
            ),
        }),
        [tileUuid, tables, dashboardFilters, dashboardTemporaryFilters],
    );
};

export default useDashboardFiltersForExplore;
