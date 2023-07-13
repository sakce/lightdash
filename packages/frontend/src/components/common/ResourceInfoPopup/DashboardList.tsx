import { Anchor, List, Text } from '@mantine/core';
import { FC } from 'react';
import { useDashboardsContainingChart } from '../../../hooks/dashboard/useDashboards';

type Props = {
    resourceItemId: string;
    projectUuid: string;
};

export const DashboardList: FC<Props> = ({ resourceItemId, projectUuid }) => {
    const { data: relatedDashboards } = useDashboardsContainingChart(
        projectUuid,
        resourceItemId,
    );
    return (
        <>
            <Text fw={600} fz="xs" color="gray.6">
                Used in {relatedDashboards?.length ?? 0} dashboard
                {relatedDashboards?.length === 1 ? '' : 's'}
                {relatedDashboards && relatedDashboards.length > 0 ? ':' : ''}
            </Text>
            {!!relatedDashboards?.length && (
                <List size="xs">
                    {relatedDashboards.map(({ uuid, name }) => (
                        <List.Item key={uuid}>
                            <Anchor
                                href={`${window.location.origin}/projects/${projectUuid}/dashboards/${uuid}/view/`}
                                target="_blank"
                            >
                                {name}
                            </Anchor>
                        </List.Item>
                    ))}
                </List>
            )}
        </>
    );
};
