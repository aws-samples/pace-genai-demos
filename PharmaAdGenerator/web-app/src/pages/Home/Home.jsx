// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import "../../App.css";
import {
  SpaceBetween,
  ContentLayout,
  Container,
  Header,
  ColumnLayout,
  FormField,
  Select,
  Box,
  Button,
  ProgressBar,
} from "@cloudscape-design/components";
import { useEffect, useCallback, useState } from "react";
import { API } from "@aws-amplify/api";
import { Storage } from "@aws-amplify/storage";
import { applyTheme } from "@cloudscape-design/components/theming";
import styled from "styled-components";

applyTheme({
  theme: {
    tokens: {
      fontFamilyBase:
        "'Amazon Ember', 'Helvetica Neue', Roboto, Arial, sans-serif",
      borderRadiusContainer: "0.125rem",
      borderRadiusButton: "0.250rem",
    },
    contexts: {
      header: {
        tokens: {
          colorBackgroundContainerHeader: "transparent",
        },
      },
    },
  },
});

export function HomeView() {
  const [pdfList, setPdfList] = useState([]);
  const [imageList, setImageList] = useState([]);

  const [location, setLocation] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageType, setImageType] = useState(null);
  const [fdaGuideline, setFdGuideline] = useState(null);
  const [textModel, setTextModel] = useState(null);
  const [imageModel, setImageModel] = useState(null);

  const [progressValue, setProgressValue] = useState(0);
  const [progressValueAdvance, setProgressValueAdvance] = useState(0);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isTaskProgress, setIsTaksProgress] = useState(false);
  const [isAdvanceUse, setIsAdvanceUse] = useState(false);
  const [isSummaryProgress, setIsSummaryProgress] = useState(false);
  const [isImageProgress, setIsImageProgress] = useState(false);
  const [isPipelineComplete, setIsPipelineComplete] = useState(false);
  const [image, setImage] = useState("");

  const DEFAULT_SUMMARY =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

  const DEFAULT_TITLE =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [title, setTitle] = useState(DEFAULT_TITLE);

  const locationList = [
    {
      value: "Brazil",
      // iconUrl: "brazil.png",
    },
    {
      value: "Canada",
      // iconUrl: "canada.png",
    },
    {
      value: "France",
      // iconUrl: "france.png",
    },
    {
      value: "Germany",
      // iconUrl: "germany.png",
    },
    {
      value: "Italy",
      // iconUrl: "italy.png",
    },
    {
      value: "Mexico",
      // iconUrl: "mexico.png",
    },
    {
      value: "United States",
      // iconUrl: "united-states.png",
    },
  ];

  const fdaList = [
    {
      value: "Yes",
      //   iconUrl: "check.png",
    },
    {
      value: "No",
      //   iconUrl: "close.png",
    },
  ];

  const imageTypeList = [
    {
      value: "Analog-film",
      //   iconUrl: "artist.png",
    },
    {
      value: "Anime",
      //   iconUrl: "artist.png",
    },
    {
      value: "Cinematic",
      //   iconUrl: "artist.png",
    },
    {
      value: "Comic-book",
      //   iconUrl: "artist.png",
    },
    {
      value: "Cubism",
      //   iconUrl: "artist.png",
    },
    {
      value: "Digital-art",
      //   iconUrl: "artist.png",
    },
    {
      value: "Enhance",
      //   iconUrl: "artist.png",
    },
    {
      value: "Fantasy-art",
      //   iconUrl: "artist.png",
    },
    {
      value: "Isometric",
      //   iconUrl: "artist.png",
    },
    {
      value: "Line-art",
      //   iconUrl: "artist.png",
    },
    {
      value: "Low-poly",
      //   iconUrl: "artist.png",
    },
    {
      value: "Modeling-compound",
      //   iconUrl: "artist.png",
    },
    {
      value: "Neon-punk",
      //   iconUrl: "artist.png",
    },
    {
      value: "Origami",
      //   iconUrl: "artist.png",
    },
    {
      value: "Photographic",
      //   iconUrl: "artist.png",
    },
    {
      value: "Pixel-art",
      //   iconUrl: "artist.png",
    },
    {
      value: "Tile-texture",
      //   iconUrl: "artist.png",
    },
    {
      value: "3d-model",
      //   iconUrl: "artist.png",
    },
  ];

  const [textModelList, setTextModelList] = useState([
    {
      value: "Anthropic Claude V2",
      iconUrl: "anthropic_dark_24x24.svg",
    },
    {
      value: "Anthropic Claude V1",
      iconUrl: "anthropic_dark_24x24.svg",
    },
    {
      value: "AI21 Jurassic-2 Ultra V1",
      iconUrl: "ai21_dark_24x24.svg",
    },
    {
      value: "AI21 Jurassic-2 Mid V1",
      iconUrl: "ai21_dark_24x24.svg",
    },
  ]);

  const imageModelList = [
    {
      value: "Stable Diffusion XL",
      iconUrl: "stability_dark_24x24.svg",
    },
  ];

  useEffect(() => {
    async function fetchData() {
      const response = await API.get("api", "/api/assets/specifications");

      setPdfList(
        response.map((result) => ({
          value: result.id,
        }))
      );

      const imagesResponse = await Storage.list("reference-images");
      setImageList(
        imagesResponse.results.map((result) => ({
          id: result.key,
          value: result.key.replace("reference-images/", ""),
        }))
      );
    }
    fetchData();
  }, []);

  async function APICallSummaryClaudeV2() {
    const payload_summary = {
      document_id: pdfFile,
      location: location,
      fda: fdaGuideline,
    };

    try {
      const response_summary = await API.post(
        "api",
        "api/anthropic-claude-v2",
        {
          body: payload_summary,
        }
      );

      setSummary(response_summary["summary"]);
      setTitle(response_summary["title"]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setSummary("Error fetching data.");
      setTitle("Error fetching data.");
    }
  }

  async function APICallSummaryClaudeV1() {
    const payload_summary = {
      document_id: pdfFile,
      location: location,
      fda: fdaGuideline,
    };

    try {
      const response_summary = await API.post(
        "api",
        "api/anthropic-claude-v1",
        {
          body: payload_summary,
        }
      );
      console.log(response_summary);
      setSummary(response_summary["summary"]);
      setTitle(response_summary["title"]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setSummary("Error fetching data.");
      setTitle("Error fetching data.");
    }
  }

  async function APICallSummaryAI21Ultra() {
    const payload_summary = {
      document_id: pdfFile,
      location: location,
      fda: fdaGuideline,
    };
    try {
      const response_summary = await API.post("api", "api/ai21-ultra-v1", {
        body: payload_summary,
      });
      console.log(response_summary);
      setSummary(response_summary["summary"]);
      setTitle(response_summary["title"]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setSummary("Error fetching data.");
      setTitle("Error fetching data.");
    }
  }

  async function APICallSummaryAI21Mid() {
    const payload_summary = {
      document_id: pdfFile,
      location: location,
      fda: fdaGuideline,
    };
    try {
      const response_summary = await API.post("api", "api/ai21-mid-v1", {
        body: payload_summary,
      });
      console.log(response_summary);
      setSummary(response_summary["summary"]);
      setTitle(response_summary["title"]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setSummary("Error fetching data.");
      setTitle("Error fetching data.");
    }
  }

  async function APICallImage() {
    const payload_image = {
      location: location,
      style: imageType,
      source_image: imageFile,
    };

    try {
      const response_image = await API.post("api", "api/stable-diffusion-xl", {
        body: payload_image,
      });

      const image_base64 = `data:image/jpeg;base64,${response_image[0].base64}`;
      setImage(image_base64);
    } catch (error) {
      console.error("Error fetching data:", error);
      setImage("");
    }
  }

  const createAd = () => {
    setProgressValue(0);
    setIsSubmitted(true);
  };

  const RegenerateSummary = () => {
    setProgressValueAdvance(0);
    setIsAdvanceUse(true);
    setIsTaksProgress(true);
    setIsSummaryProgress(true);
  };

  const RegenerateImage = () => {
    setProgressValueAdvance(0);
    setIsAdvanceUse(true);
    setIsTaksProgress(true);
    setIsImageProgress(true);
  };

  useEffect(() => {
    async function updateProgressWithAdvance() {
      if (isTaskProgress && isSummaryProgress) {
        if (textModel.value === "Anthropic Claude V2") {
          setProgressValueAdvance(50);
          await APICallSummaryClaudeV2();
        } else if (textModel.value === "Anthropic Claude V1") {
          setProgressValueAdvance(50);
          await APICallSummaryClaudeV1();
        } else if (textModel.value === "AI21 Jurassic-2 Ultra V1") {
          await APICallSummaryAI21Ultra();
        } else if (textModel.value === "AI21 Jurassic-2 Mid V1") {
          await APICallSummaryAI21Ultra();
        }
        setProgressValueAdvance(100);
        setIsTaksProgress(false);
        setIsSummaryProgress(false);
      } else if (isTaskProgress && isImageProgress) {
        setProgressValueAdvance(50);
        await APICallImage();
        setProgressValueAdvance(100);
        setIsTaksProgress(false);
        setIsImageProgress(false);
      }
    }
    updateProgressWithAdvance();
  }, [isTaskProgress]);

  const allFieldsFilled = () => {
    return (
      location &&
      pdfFile &&
      imageType &&
      imageFile &&
      fdaGuideline &&
      textModel &&
      imageModel
    );
  };

  function allFieldsReset() {
    setIsSubmitted(false);
    setIsTaksProgress(false);
    setIsAdvanceUse(false);
    setIsSummaryProgress(false);
    setIsImageProgress(false);
    setIsPipelineComplete(false);
    setImageFile("");
    setLocation("");
    setPdfFile("");
    setImageType("");
    setFdGuideline("");
    setTextModel("");
    setImageModel("");
    setImage("");
    setSummary(DEFAULT_SUMMARY);
    setTitle(DEFAULT_TITLE);
  }

  const areRequiredFieldsFilled = () => {
    return location && pdfFile && imageType && imageFile && fdaGuideline;
  };

  useEffect(() => {
    async function updateProgressWithAPIs() {
      if (isSubmitted) {
        await APICallImage();
        setProgressValue(50);
        if (textModel.value === "Anthropic Claude V2") {
          await APICallSummaryClaudeV2();
          setProgressValue(100);
          setIsPipelineComplete(true);
        } else if (textModel.value === "Anthropic Claude V1") {
          await APICallSummaryClaudeV1();
          setProgressValue(100);
          setIsPipelineComplete(true);
        } else if (textModel.value === "AI21 Jurassic-2 Ultra V1") {
          await APICallSummaryAI21Ultra();
          setProgressValue(100);
          setIsPipelineComplete(true);
        } else if (textModel.value === "AI21 Jurassic-2 Mid V1") {
          await APICallSummaryAI21Mid();
          setProgressValue(100);
          setIsPipelineComplete(true);
        }
      }
    }
    updateProgressWithAPIs();
  }, [isSubmitted]);

  const ScrollableContainer = styled(Container)`
    max-height: 448px;
    overflow-y: auto;
  `;

  return (
    <ContentLayout
      header={
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
                  Guru Content Studio
                </Box>
                <Box
                  fontWeight="light"
                  padding={{ bottom: "xl" }}
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
                  Powered by foundation models, Pharma Ad Generator Studio
                  harnesses the capabilities of generative AI to instantly
                  produce mock pharmaceutical ads derived from prescribing
                  information. Our platform crafts localized and personalized
                  ads, ensuring each content piece achieves maximum reach and
                  impact. This not only boosts your marketing ROI but also
                  significantly reduces time spent on brainstorming, drafting,
                  and revising. Generative AI can help generate modular content
                  variants to drive patient and provider engagement. By
                  generating content variants more quickly, GenAI can reduce
                  marketing agency costs, improve personalization, and
                  streamline Medical, Legal, and Regulatory (MLR) reviews.
                </Box>
              </SpaceBetween>
            </div>
          </Box>
        </Header>
      }
    >
      <SpaceBetween size="xxl">
        <Container header={<Header variant="h2">Ad Configuration</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              Specify the configuration for the Pharma Studio model to use when
              generating the ad. By specifying these configurations, you ensure
              that the model generates the ad in alignment with your desired
              criteria and preferences. This customization ensures optimal ad
              creation that resonates with your target audience and meets the
              standards of the pharmaceutical industry.
            </Box>

            <ColumnLayout columns={2}>
              <FormField
                label="Document"
                constraintText="Document used to generate the description"
                stretch={true}
                i18nStrings={{
                  errorIconAriaLabel: "Error",
                }}
              >
                <Select
                  disabled={isSubmitted}
                  selectedOption={pdfFile}
                  options={pdfList}
                  onChange={({ detail }) => setPdfFile(detail.selectedOption)}
                  placeholder="Select a pdf"
                />
              </FormField>
              <FormField
                label="Image"
                constraintText="Image used to initialize the diffusion process"
                stretch={true}
                i18nStrings={{
                  errorIconAriaLabel: "Error",
                }}
              >
                <Select
                  disabled={isSubmitted}
                  selectedOption={imageFile}
                  options={imageList}
                  onChange={({ detail }) => setImageFile(detail.selectedOption)}
                  placeholder="Select an image"
                />
              </FormField>
              <FormField
                label="Location"
                constraintText="Location used to generate the localized image"
                stretch={true}
                i18nStrings={{
                  errorIconAriaLabel: "Error",
                }}
              >
                <Select
                  disabled={isSubmitted}
                  selectedOption={location}
                  options={locationList}
                  onChange={({ detail }) => setLocation(detail.selectedOption)}
                  placeholder="Choose a location"
                />
              </FormField>

              <FormField
                label="Style"
                constraintText="Style used to generate the image"
                stretch={true}
                i18nStrings={{
                  errorIconAriaLabel: "Error",
                }}
              >
                <Select
                  disabled={isSubmitted}
                  selectedOption={imageType}
                  options={imageTypeList}
                  onChange={({ detail }) => setImageType(detail.selectedOption)}
                  placeholder="Choose an image style"
                />
              </FormField>

              <FormField
                label="FDA Advertising Guidances"
                constraintText="The FDA regulates advertising only for prescription drugs"
                stretch={true}
                i18nStrings={{
                  errorIconAriaLabel: "Error",
                }}
              >
                <Select
                  disabled={isSubmitted}
                  selectedOption={fdaGuideline}
                  options={fdaList}
                  onChange={({ detail }) =>
                    setFdGuideline(detail.selectedOption)
                  }
                  placeholder="Choose FDA Advertising Guidances"
                />
              </FormField>
            </ColumnLayout>
          </SpaceBetween>
        </Container>
        <SpaceBetween size="xxl">
          <Container header={<Header variant="h2">Model Setup</Header>}>
            <SpaceBetween size="s">
              <Box variant="p">
                Choose the Foundation Models to use to create new pieces of
                original content, such as short description of the drug and
                realistic and artistic images of various subjects, environments,
                and scenes from language prompts. The models are designed to
                follow natural language instructions.
              </Box>

              <ColumnLayout columns={2}>
                <FormField
                  label="Text Generation Model"
                  constraintText="Text generation model used to generate the description"
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    disabled={!areRequiredFieldsFilled() || isSubmitted}
                    selectedOption={textModel}
                    options={textModelList}
                    onChange={({ detail }) =>
                      setTextModel(detail.selectedOption)
                    }
                    placeholder="Select a text generation model"
                  />
                </FormField>
                <FormField
                  label="Image Generation Model"
                  constraintText="Image generation model is used to produce the imagery"
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    disabled={!areRequiredFieldsFilled() || isSubmitted}
                    selectedOption={imageModel}
                    options={imageModelList}
                    onChange={({ detail }) =>
                      setImageModel(detail.selectedOption)
                    }
                    placeholder="Select an image generation model"
                  />
                </FormField>
              </ColumnLayout>
            </SpaceBetween>
          </Container>
        </SpaceBetween>

        {isSubmitted && (
          <ProgressBar
            value={progressValue}
            additionalInfo="Please wait while the model is generating the new original content"
            description="This might take a few seconds"
            label="Creating the new localize pharmaceutical ads"
          />
        )}

        <Header
          variant="h2"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/0/05/Gtk-undo-ltr.svg"
                onClick={allFieldsReset}
              >
                Reset
              </Button>
              <Button
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/6/61/Crystal_Clear_app_clean.svg"
                variant="primary"
                onClick={createAd}
                disabled={!allFieldsFilled() || isSubmitted}
              >
                Submit
              </Button>
            </SpaceBetween>
          }
        ></Header>

        <Container
          media={{
            content: <img src={image} alt="placeholder" />,
            position: "side",
            width: "50%",
          }}
        >
          {" "}
          <ScrollableContainer>
            <SpaceBetween direction="vertical" size="s">
              <SpaceBetween direction="vertical" size="xxs">
                <Box variant="h1">{title}</Box>
              </SpaceBetween>
              <Box fontSize="heading-xs" variant="p">
                {summary}
              </Box>
            </SpaceBetween>
          </ScrollableContainer>
        </Container>

        {isAdvanceUse && (
          <ProgressBar
            value={progressValueAdvance}
            additionalInfo="Please wait while the model is modifying the content"
            description="This might take a few seconds"
            label="Editing the localize pharmaceutical ads"
          />
        )}

        <Header
          variant="h2"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/0/05/Gtk-undo-ltr.svg"
                onClick={allFieldsReset}
              >
                Reset
              </Button>
              <Button
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/e/ef/Inkscape_icons_free-hand-draw.svg"
                onClick={RegenerateSummary}
                variant="primary"
                disabled={!isPipelineComplete || isTaskProgress}
              >
                Regenerate Description
              </Button>
              <Button
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/5/51/Farm-Fresh_picture_edit.png"
                variant="primary"
                onClick={RegenerateImage}
                disabled={!isPipelineComplete || isTaskProgress}
              >
                Regenerate Image
              </Button>
            </SpaceBetween>
          }
        ></Header>
      </SpaceBetween>
    </ContentLayout>
  );
}
