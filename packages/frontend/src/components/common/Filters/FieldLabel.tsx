import {
    AdditionalMetric,
    Field,
    isAdditionalMetric,
    isField,
    TableCalculation,
} from '@lightdash/common';
import { Text } from '@mantine/core';
import { FC } from 'react';

interface FieldLabelProps {
    item: Field | TableCalculation | AdditionalMetric;
}

const FieldLabel: FC<FieldLabelProps> = ({ item }) => {
    return (
        <Text
            span
            sx={{
                whiteSpace: 'nowrap',
            }}
        >
            {isField(item) ? `${item.tableLabel} ` : ''}

            <Text span fw={500}>
                {isField(item) || isAdditionalMetric(item)
                    ? item.label
                    : item.displayName}
            </Text>
        </Text>
    );
};

export const fieldLabelText = (item: FieldLabelProps['item']) => {
    return (
        (isField(item) ? `${item.tableLabel} ` : '') +
        (isField(item) || isAdditionalMetric(item)
            ? item.label
            : item.displayName)
    );
};

export default FieldLabel;
