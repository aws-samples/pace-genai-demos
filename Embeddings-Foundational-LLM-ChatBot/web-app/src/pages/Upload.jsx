// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect, useRef } from "react";
import * as React from "react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import FileUpload from "@cloudscape-design/components/file-upload";
import Table from "@cloudscape-design/components/table";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import { API, Storage } from "aws-amplify";
import {
    StatusIndicator,
    ContentLayout,
    Pagination,
    TextContent,
    Container,
    AppLayout,
    SpaceBetween,
    TextFilter,
} from "@cloudscape-design/components";
import moment from "moment";
import Flashbar from "@cloudscape-design/components/flashbar";

export function Upload() {
    const [value, setValue] = React.useState([]);
    const [uploading, setUploading] = React.useState(false);
    const [fileUploaded, setFileUploaded] = React.useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [fetchingSyncJobs, setFetchingSyncJobs] = React.useState(false);
    const [syncJobsHistory, setSyncJobsHistory] = React.useState([]);
    const [showSyncRunModal, setShowSyncRunModal] = React.useState(false);
    const [syncStarted, setSyncStarted] = React.useState(false);
    const [currentPageIndex, setCurrentPageIndex] = useState(1); // Assuming 1-based index
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [displayedItems, setDisplayedItems] = useState([]);
    const [filterText, setFilterText] = useState("");

    const handleUpload = async () => {
        if (value.length === 0) return;
        console.log("Uploading file:", value);

        setFileUploaded(false);
        setUploading(true);
        await Promise.all(
            value.map(async (v) => {
                try {
                    await Storage.put(v.name, v);
                } catch (error) {
                    console.log("Error uploading file: ", error);
                    setValue([]);
                    setUploading(false);
                }
            }),
        );
        setUploading(false);
        setFileUploaded(true);
        setValue([]);
    };

    const onSyncNow = async () => {
        setShowSyncRunModal(true);
    };

    useEffect(() => {
        setFetchingSyncJobs(true);
        const fetchSyncRuns = async () => {
            const response = await API.get("api", "/api/document/list");

            // Sorting response by uploadDate
            response.sort((a, b) => {
                return moment(b.uploadDate.S).valueOf() - moment(a.uploadDate.S).valueOf();
            });

            setSyncJobsHistory(response);
        };
        fetchSyncRuns();
        setFetchingSyncJobs(false);
    }, []);

    const onSyncRunRefresh = async () => {
        setFetchingSyncJobs(true);
        const response = await API.get("api", "/api/document/list");

        // Sorting response by uploadDate
        response.sort((a, b) => {
            return moment(b.uploadDate.S).valueOf() - moment(a.uploadDate.S).valueOf();
        });

        setSyncJobsHistory(response);
        setFetchingSyncJobs(false);
    };

    const syncNow = async () => {
        setSyncStarted(true);
        setShowSyncRunModal(false);
    };

    const closeSyncDialog = () => {
        setShowSyncRunModal(false);
    };

    const filteredSyncJobsHistory = syncJobsHistory.filter((job) => {
        return (
            job.documentName.S.toLowerCase().includes(filterText.toLowerCase()) ||
            job.id.S.toLowerCase().includes(filterText.toLowerCase())
        );
    });

    const totalPages = Math.ceil(filteredSyncJobsHistory.length / itemsPerPage);

    useEffect(() => {
        const newDisplayedItems = filteredSyncJobsHistory.slice(
            (currentPageIndex - 1) * itemsPerPage,
            currentPageIndex * itemsPerPage,
        );
        setDisplayedItems(newDisplayedItems);
    }, [currentPageIndex, itemsPerPage, syncJobsHistory, filterText]);

    return (
        <ContentLayout
            header={
                <>
                    <div>
                        {uploading && (
                            <div style={{ paddingTop: "2%" }}>
                                <Flashbar
                                    items={[
                                        {
                                            type: "success",
                                            loading: true,
                                            content: <>Document Upload in progress.</>,
                                        },
                                    ]}
                                />
                            </div>
                        )}
                        {fileUploaded && (
                            <div style={{ paddingTop: "2%" }}>
                                <Flashbar
                                    items={[
                                        {
                                            type: "success",
                                            loading: false,
                                            content: <>Document Uploaded successfully.</>,
                                        },
                                    ]}
                                />
                            </div>
                        )}
                    </div>

                    <Header variant="h1">
                        <Box padding={{ vertical: "xl" }}>
                            <div className="custom-home__header-title">
                                <SpaceBetween size="xs">
                                    <Box
                                        variant="h1"
                                        fontWeight="bold"
                                        padding="n"
                                        fontSize="display-l"
                                        color="inherit"
                                    >
                                        Document Library
                                    </Box>
                                    <Box
                                        fontWeight="light"
                                        padding={{ bottom: "xxs" }}
                                        fontSize="display-l"
                                        color="inherit"
                                    >
                                        Embeddings RAG Chatbot
                                    </Box>
                                    <Box
                                        variant="p"
                                        padding={{ bottom: "xxs" }}
                                        fontSize="heading-xs"
                                        color="inherit"
                                    >
                                        This demo showcases the capabilities of Amazon Bedrock in
                                        creating a state-of-the-art Large Language Model (LLM)
                                        Generative AI Question and Answer Bot. Our demo is designed
                                        to provide an immersive experience, offering a glimpse into
                                        the extraordinary potential of language models in
                                        understanding and generating human-like responses. This
                                        solution also enables users to upload and switch between
                                        documents and models (AI21 Jurassic 2 Instruct (Ultra),
                                        Anthropic Claude V2, Anthropic Claude V1, Anthropic Claude
                                        Instant, Amazon Titan Text Express, and Cohere Command Text)
                                    </Box>
                                </SpaceBetween>
                            </div>
                        </Box>
                    </Header>
                </>
            }
        >
            <SpaceBetween size="xxl">
                <Container header={<Header variant="h2">Upload Document</Header>}>
                    <SpaceBetween size="xl">
                        <TextContent>
                            Upload a document to S3 for processing by the embeddings model.
                            Restrictions: Only PDF, CSV, DOC, and TXT formats are accepted. Before
                            uploading, ensure the document has a recognizable name. Please use a
                            brief name and eliminate any special characters.
                        </TextContent>

                        <FileUpload
                            onChange={({ detail }) => {
                                setValue(detail.value);
                                setUploading(false);
                                setFileUploaded(false);
                            }}
                            value={value}
                            accept={
                                "application/pdf, application/doc, application/txt, application/cvs"
                            }
                            i18nStrings={{
                                uploadButtonText: (e) => (e ? "Choose files" : "Choose file"),
                                dropzoneText: (e) =>
                                    e ? "Drop files to upload" : "Drop file to upload",
                                removeFileAriaLabel: (e) => `Remove file ${e + 1}`,
                                limitShowFewer: "Show fewer files",
                                limitShowMore: "Show more files",
                                errorIconAriaLabel: "Error",
                            }}
                            showFileLastModified
                            showFileSize
                            showFileThumbnail
                            tokenLimit={3}
                        />
                    </SpaceBetween>
                </Container>

                <Header
                    variant="h2"
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button
                                iconAlign="left"
                                onClick={handleUpload}
                                iconName="upload-download"
                            >
                                Upload
                            </Button>
                            <Button
                                onClick={onSyncRunRefresh}
                                variant="primary"
                                iconAlign="left"
                                iconName="refresh"
                            >
                                Refresh
                            </Button>
                        </SpaceBetween>
                    }
                ></Header>

                <Table
                    columnDefinitions={[
                        {
                            id: "id",
                            header: "ID",
                            cell: (e) => (e.id ? e.id.S : ""),
                        },
                        {
                            id: "documentName",
                            header: "Name",
                            cell: (e) => (e.documentName ? e.documentName.S : ""),
                        },
                        {
                            id: "type",
                            header: "Type",
                            cell: (e) => (e.type ? e.type.S : ""),
                        },
                        {
                            id: "uploadDate",
                            header: "Upload Date",
                            cell: (e) =>
                                e.uploadDate
                                    ? moment(e.uploadDate.S).format("YYYY-MM-DD HH:mm:ss a")
                                    : "",
                        },
                        {
                            id: "document_status",
                            header: "Status",

                            cell: (e) => {
                                if (e.document_status.S == "COMPLETED") {
                                    return (
                                        <StatusIndicator type="success">
                                            {" "}
                                            {e.document_status.S}
                                        </StatusIndicator>
                                    );
                                } else if (e.document_status.S == "PROCESSING") {
                                    return (
                                        <StatusIndicator type="pending">
                                            {" "}
                                            {e.document_status.S || ""}
                                        </StatusIndicator>
                                    );
                                } else if (
                                    e.document_status.S == "FAILED" ||
                                    e.document_status.S == ""
                                ) {
                                    return (
                                        <StatusIndicator type="error">
                                            {" "}
                                            {e.document_status.S || ""}
                                        </StatusIndicator>
                                    );
                                }
                            },
                        },
                    ]}
                    items={displayedItems}
                    loading={fetchingSyncJobs}
                    loadingText="Loading documents ..."
                    trackBy="name"
                    empty={
                        <Box textAlign="center" color="inherit">
                            <b>No documents</b>
                            <Box padding={{ bottom: "s" }} variant="p" color="inherit">
                                No documents to display.
                            </Box>
                        </Box>
                    }
                    header={
                        <div style={{ paddingTop: "1%", paddingBottom: "1%" }}>
                            <Header counter={"(" + syncJobsHistory.length + ")"}>
                                Knowledge Source
                            </Header>
                        </div>
                    }
                    pagination={
                        <Pagination
                            currentPageIndex={currentPageIndex}
                            pagesCount={totalPages}
                            onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
                        />
                    }
                    filter={
                        <TextFilter
                            filteringPlaceholder="Find document"
                            filteringText={filterText}
                            onChange={(e) => {
                                if (e && e.detail && typeof e.detail.filteringText === "string") {
                                    setFilterText(e.detail.filteringText);
                                }
                            }}
                        />
                    }
                />
            </SpaceBetween>
        </ContentLayout>
    );
}
