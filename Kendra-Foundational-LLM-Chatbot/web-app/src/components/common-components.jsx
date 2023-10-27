/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import { Button, ButtonDropdown, Header, SpaceBetween } from "@cloudscape-design/components";
import { getHeaderCounterText, getServerHeaderCounterText } from "./table-counter-strings";

function getCounter(props) {
    if (props.counter) {
        return props.counter;
    }
    if (!props.totalItems) {
        return null;
    }
    if (props.serverSide) {
        return getServerHeaderCounterText(props.totalItems, props.selectedItems);
    }
    return getHeaderCounterText(props.totalItems, props.selectedItems);
}

export const PageHeader = ({ buttons }) => {
    return <></>;
};

export const TableHeader = (props) => {
    return <></>;
};
