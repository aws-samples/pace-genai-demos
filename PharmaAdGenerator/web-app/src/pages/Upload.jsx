// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import { API } from "@aws-amplify/api";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  Box,
  Button,
  Container,
  ContentLayout,
  FileUpload,
  Flashbar,
  Header,
  Pagination,
  SpaceBetween,
  StatusIndicator,
  Table,
  Tabs,
  TextContent,
} from "@cloudscape-design/components";
import { Storage } from "aws-amplify";
import moment from "moment";
import { useEffect, useState } from "react";

export function Upload() {
  const [value, setValue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [images, setImages] = useState([]);

  const [pdfsFilterText, setPdfsFilterText] = useState("");
  const [imagesFilterText, setImagesFilterText] = useState("");

  const ITEMS_PER_PAGE = 10;
  const [pdfsCurrentPageIndex, setPdfsCurrentPageIndex] = useState(0);
  const [imagesCurrentPageIndex, setImagesCurrentPageIndex] = useState(0);

  useEffect(() => {
    const fetchSyncRuns = async () => {
      try {
        setLoading(true);
        const fetchedPdfs = await API.get("api", "/api/assets/specifications");
        fetchedPdfs.sort(
          (a, b) =>
            moment(b.timestamp).valueOf() - moment(a.timestamp).valueOf()
        );

        const fetchedImages = await Storage.list("reference-images");
        fetchedImages.results.sort(
          (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
        );

        setPdfs(fetchedPdfs || []);
        setImages(fetchedImages.results || []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchSyncRuns();
  }, []);

  const handleUpload = async () => {
    if (!value.length) return;

    setUploading(true);
    await Promise.all(
      value.map(async (v) => {
        let key;
        switch (v.type) {
          case "image/jpeg":
          case "image/png":
            key = "reference-images";
            break;
          case "application/pdf":
            key = "reference-specifications";
            break;
          default:
            key = "unknown";
            break;
        }
        try {
          await Storage.put(`${key}/${v.name}`, v);
        } catch (error) {
          console.log("Error uploading file: ", error);
          setValue([]);
          setUploading(false);
        }
      })
    );
    setUploading(false);
    setFileUploaded(true);
    setValue([]);
  };

  const onSyncRunRefresh = async () => {
    setLoading(true);
    const fetchedImages = await Storage.list("reference-images");
    const fetchedPdfs = await API.get("api", "/api/assets/specifications");

    fetchedPdfs.sort(
      (a, b) => moment(b.timestamp).valueOf() - moment(a.timestamp).valueOf()
    );
    fetchedPdfs.sort(
      (a, b) => moment(b.timestamp).valueOf() - moment(a.timestamp).valueOf()
    );

    setPdfs(fetchedPdfs || []);
    setImages(fetchedImages.results || []);
    setLoading(false);
  };

  const displayedItems = (items, currentPageIndex) =>
    items.slice(
      currentPageIndex * ITEMS_PER_PAGE,
      (currentPageIndex + 1) * ITEMS_PER_PAGE
    );

  const handlePageChange =
    (type) =>
    ({ detail }) => {
      setLoading(true);
      const newPageIndex = detail.currentPageIndex - 1;
      if (type === "pdfs") {
        setPdfsCurrentPageIndex(newPageIndex);
      } else {
        setImagesCurrentPageIndex(newPageIndex);
      }
      setLoading(false);
    };

  return (
    <ContentLayout
      header={
        <>
          {uploading && (
            <Flashbar
              items={[
                {
                  type: "success",
                  loading: true,
                  content: <>Document Upload in progress.</>,
                },
              ]}
            />
          )}
          {fileUploaded && (
            <Flashbar
              items={[
                {
                  type: "success",
                  loading: false,
                  content: <>Document Uploaded successfully.</>,
                },
              ]}
            />
          )}
          <Header variant="h1">
            <Box padding={{ vertical: "xl" }}>
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
                  Pharma Ad Generator
                </Box>
                <Box
                  variant="p"
                  padding={{ bottom: "xxs" }}
                  fontSize="heading-xs"
                  color="inherit"
                >
                  Leveraging the robust Amazon Bedrock foundation models, Pharma
                  Ad Generator Studio harnesses the capabilities of generative
                  AI to instantly produce mock pharmaceutical ads derived from
                  prescribing information. Our platform tailors localized and
                  bespoke ads, optimizing each content for unparalleled reach
                  and resonance. Experience enhanced marketing ROI and notably
                  trim down time spent on ideation, drafting, and editing. With
                  Generative AI at its core, the platform efficiently produces
                  diverse content versions, amplifying engagement with both
                  patients and providers. Fast-track content production with
                  GenAI to not only curtail agency expenses but also elevate
                  personalization and expedite Medical, Legal, and Regulatory
                  (MLR) reviews.
                </Box>
              </SpaceBetween>
            </Box>
          </Header>
        </>
      }
    >
      <SpaceBetween size="xxl">
        <Container header={<Header variant="h2">Upload Document</Header>}>
          <SpaceBetween size="xl">
            <TextContent>
              Upload pdfs & images into S3 for ad content generation pipeline.
              Limitations: Only one-page PDF documents are supported to generate
              the description. The model will use the PDF and Image to create a
              localized marketing asset. This will allow customers to quickly
              adapt to various markets, maximize the reach and impact of every
              piece of content.
            </TextContent>

            <FileUpload
              onChange={({ detail }) => {
                setValue(detail.value);
                setUploading(false);
                setFileUploaded(false);
              }}
              value={value}
              accept={"image/jpeg,image/png,application/pdf"}
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
              <Button iconAlign="left" onClick={handleUpload}>
                Upload
              </Button>
              <Button
                onClick={onSyncRunRefresh}
                variant="primary"
                iconName="refresh"
              >
                Refresh
              </Button>
            </SpaceBetween>
          }
        ></Header>

        <Container>
          <Tabs
            tabs={[
              {
                label: "Medical and Drug Document ",
                id: "pdfs",
                content: (
                  <Table
                    columnDefinitions={[
                      {
                        id: "id",
                        header: "Name",
                        cell: (e) =>
                          e.id
                            ? e.id.replace("reference-specifications/", "")
                            : "",
                      },
                      {
                        id: "uid",
                        header: "UID",
                        cell: (e) => (e.uid ? e.uid : ""),
                      },
                      {
                        id: "type",
                        header: "Type",
                        cell: (e) => (e.document_type ? e.document_type : ""),
                      },
                      {
                        id: "lastModified",
                        header: "Last Modified",
                        cell: (e) =>
                          e.timestamp
                            ? moment(e.timestamp).format(
                                "YYYY-MM-DD HH:mm:ss a"
                              )
                            : "",
                      },
                      {
                        id: "status",
                        header: "Status",
                        cell: (e) => {
                          if (e.document_status == "Completed") {
                            return (
                              <StatusIndicator type="success">
                                {" "}
                                {e.document_status}
                              </StatusIndicator>
                            );
                          } else if (e.document_status == "Processing") {
                            return (
                              <StatusIndicator type="pending">
                                {" "}
                                {e.document_status}
                              </StatusIndicator>
                            );
                          }
                        },
                      },
                    ]}
                    items={displayedItems(pdfs, pdfsCurrentPageIndex)}
                    pagination={
                      <Pagination
                        currentPageIndex={pdfsCurrentPageIndex + 1}
                        pagesCount={Math.ceil(pdfs.length / ITEMS_PER_PAGE)}
                        onChange={handlePageChange("pdfs")}
                      />
                    }
                    loading={loading}
                    variant="embedded"
                    key={pdfsCurrentPageIndex}
                    loadingText="Loading uploaded files ..."
                    trackBy="name"
                    empty={
                      <Box textAlign="center" color="inherit">
                        <b>No documents</b>
                        <Box
                          padding={{ bottom: "s" }}
                          variant="p"
                          color="inherit"
                        >
                          No files to display
                        </Box>
                      </Box>
                    }
                    header={
                      <div style={{ paddingTop: "1%", paddingBottom: "1%" }}>
                        <Header counter={"(" + pdfs.length + ")"}>
                          Documents
                        </Header>
                      </div>
                    }
                  />
                ),
              },
              {
                label: "Source Pharma Image",
                id: "images",
                content: (
                  <Table
                    columnDefinitions={[
                      {
                        id: "id",
                        header: "Name",
                        cell: (e) =>
                          e.key ? e.key.replace("reference-images/", "") : "",
                      },
                      {
                        id: "eTag",
                        header: "UID",
                        cell: (e) =>
                          e.lastModified
                            ? e.eTag.replace(/"/g, "").toUpperCase()
                            : "",
                      },
                      {
                        id: "size",
                        header: "Size",
                        cell: (e) =>
                          e.lastModified
                            ? `${(e.size / 1024).toFixed(2)} KB`
                            : "",
                      },
                      {
                        id: "lastModified",
                        header: "Last Modified",
                        cell: (e) =>
                          e.lastModified
                            ? moment(e.lastModified).format(
                                "YYYY-MM-DD HH:mm:ss a"
                              )
                            : "",
                      },
                      {
                        id: "status",
                        header: "Status",
                        cell: (e) => (
                          <StatusIndicator>Completed</StatusIndicator>
                        ),
                      },
                    ]}
                    items={displayedItems(images, imagesCurrentPageIndex)}
                    pagination={
                      <Pagination
                        currentPageIndex={imagesCurrentPageIndex + 1}
                        pagesCount={Math.ceil(images.length / ITEMS_PER_PAGE)}
                        onChange={handlePageChange("images")}
                      />
                    }
                    loading={loading}
                    variant="embedded"
                    key={imagesCurrentPageIndex}
                    loadingText="Loading uploaded files ..."
                    trackBy="name"
                    empty={
                      <Box textAlign="center" color="inherit">
                        <b>No image</b>
                        <Box
                          padding={{ bottom: "s" }}
                          variant="p"
                          color="inherit"
                        >
                          No files to display
                        </Box>
                      </Box>
                    }
                    header={
                      <div style={{ paddingTop: "1%", paddingBottom: "1%" }}>
                        <Header counter={"(" + images.length + ")"}>
                          Images
                        </Header>
                      </div>
                    }
                  />
                ),
              },
            ]}
          />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
