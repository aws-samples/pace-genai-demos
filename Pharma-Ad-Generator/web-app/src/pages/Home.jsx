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

// --
// --  Author:        Jin Tan Ruan
// --  Date:          04/11/2023
// --  Purpose:       Home Component
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

import { API } from "@aws-amplify/api";
import { Storage } from "@aws-amplify/storage";
import {
  Box,
  Button,
  ColumnLayout,
  Container,
  ContentLayout,
  FormField,
  Header,
  ProgressBar,
  Select,
  SpaceBetween,
  Flashbar,
} from "@cloudscape-design/components";
import { applyTheme } from "@cloudscape-design/components/theming";
import { useEffect, useState } from "react";
import styled from "styled-components";
import "../App.css";

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
  const [audience, setAudience] = useState(null);
  const [toneStyle, setToneStyle] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [objectives, setObjectives] = useState(null);
  const [textModel, setTextModel] = useState(null);
  const [textModelTemperature, setTextModelTemperature] = useState(null);
  const [imageModelStrength, setImageModelStrength] = useState(null);
  const [imageModelSteps, setImageModelSteps] = useState(null);
  const [imageModel, setImageModel] = useState(null);
  const [imageStyle, setImageStyle] = useState(null);
  const [progressValue, setProgressValue] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [image, setImage] = useState("background.svg");
  const MAX_RETRIES = 2;
  const BASE_DELAY = 10000; // 10 seconds

  const DEFAULT_SUMMARY =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

  const DEFAULT_TITLE =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [displayTitle, setDisplayTitle] = useState(DEFAULT_TITLE);
  const [displaySummary, setDisplaySummary] = useState(DEFAULT_SUMMARY);

  const [errorMessage, setErrorMessage] = useState([
    {
      header: "Failed to generate content",
      content: "Internal Server Error. Please try again",
      dismissLabel: "Dismiss message",
      type: "error",
    },
  ]);

  const locationList = [
    {
      value: "Australia",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
    {
      value: "Brazil",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
    {
      value: "Canada",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
    {
      value: "Chile",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },

    {
      value: "Colombia",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
    {
      value: "France",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
    {
      value: "Germany",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
    {
      value: "Italy",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
    {
      value: "Mexico",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
    {
      value: "New Zealand",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
    {
      value: "United Kingdom",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },

    {
      value: "United States",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/f3/Gnome-globe.svg",
    },
  ];

  const complianceList = [
    {
      value: "FDA Compliance (U.S.)",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/4/4b/Gartoon_actions_tool_clipboard.svg",
    },
    {
      value: "EMA Compliance (Europe)",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/4/4b/Gartoon_actions_tool_clipboard.svg",
    },
    {
      value: "Health Canada (Canada)",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/4/4b/Gartoon_actions_tool_clipboard.svg",
    },
    {
      value: "TGA Compliance (Australia)",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/4/4b/Gartoon_actions_tool_clipboard.svg",
    },
    {
      value: "None/Other",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/4/4b/Gartoon_actions_tool_clipboard.svg",
    },
  ];

  const audienceList = [
    {
      id: "Adolescents",
      value: "Adolescents (13-18 years)",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/a/ac/Bimetrical_icon_person.svg",
    },
    {
      id: "Young Adults",
      value: "Young Adults (19-35 years)",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/a/ac/Bimetrical_icon_person.svg",
    },
    {
      id: "Middle-Aged",
      value: "Middle-Aged (36-60 years)",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/a/ac/Bimetrical_icon_person.svg",
    },
    {
      id: "Elderly Patients",
      value: "Elderly Patients (60+ years)",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/a/ac/Bimetrical_icon_person.svg",
    },
  ];

  const toneList = [
    {
      value: "Informative",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/2/2a/Sound_workshop.svg",
    },
    {
      value: "Emotional",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/2/2a/Sound_workshop.svg",
    },
    {
      value: "Empowering",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/2/2a/Sound_workshop.svg",
    },
    {
      value: "Uplifting",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/2/2a/Sound_workshop.svg",
    },
    {
      value: "Serious",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/2/2a/Sound_workshop.svg",
    },
  ];

  const platformList = [
    {
      value: "Brochures",
      iconUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Essay.svg",
    },
    {
      value: "Print Poster",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/4/4e/Document-open_Gion.svg",
    },
    {
      value: "Facebook",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/f/fb/Facebook_icon_2013.svg",
    },
    {
      value: "Instagram",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg",
    },

    {
      value: "X",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/e/e6/Twitter-new-logo.jpg",
    },
    {
      value: "LinkedLn",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/e/e9/Linkedin_icon.svg",
    },
    {
      value: "Google Ads",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/cc/Google_Ads_icon.svg",
    },
  ];

  const objectivesList = [
    {
      value: "Product Launch",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/e/e2/Target-iso-color.png",
    },
    {
      value: "Brand Awareness",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/e/e2/Target-iso-color.png",
    },
    {
      value: "Patient Education",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/e/e2/Target-iso-color.png",
    },
  ];

  const imageStyleList = [
    {
      value: "Analog-film",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/c4/Gnome-dev-camera.svg",
    },

    {
      value: "Cinematic",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/c4/Gnome-dev-camera.svg",
    },

    {
      value: "Digital-art",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/c4/Gnome-dev-camera.svg",
    },
    {
      value: "Enhance",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/c4/Gnome-dev-camera.svg",
    },

    {
      value: "Photographic",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/c4/Gnome-dev-camera.svg",
    },
  ];

  const [textModelList, setTextModelList] = useState([
    {
      id: "anthropic.claude-v2",
      value: "Anthropic Claude V2",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/a/a3/Tools_nicu_buculei_01.svg",
    },
    {
      id: "anthropic.claude-v1",
      value: "Anthropic Claude V1",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/a/a3/Tools_nicu_buculei_01.svg",
    },
    {
      id: "ai21.j2-ultra-v1",
      value: "AI21 Jurassic-2 Ultra V1",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/a/a3/Tools_nicu_buculei_01.svg",
    },
    {
      id: "ai21.j2-mid-v1",
      value: "AI21 Jurassic-2 Mid V1",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/a/a3/Tools_nicu_buculei_01.svg",
    },
  ]);

  const [textModelTemperatureList, setTextModelTemperatureList] = useState([
    {
      value: "Low",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/c7/Temp_HotSR.png",
    },
    {
      value: "Medium",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/c7/Temp_HotSR.png",
    },
    {
      value: "High",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/c7/Temp_HotSR.png",
    },
  ]);

  const [imageModelStrengthList, setImageModelStrengthLists] = useState([
    {
      value: "Low",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/1/1e/Emblem-photos.svg",
    },
    {
      value: "Medium",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/1/1e/Emblem-photos.svg",
    },
    {
      value: "High",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/1/1e/Emblem-photos.svg",
    },
  ]);

  const [imageModelList, setImageModelList] = useState([
    {
      id: "stability.stable-diffusion-xl-v0",
      value: "Stable Diffusion XL",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/c/c2/Crystal128-tool-brush.svg",
    },
  ]);

  const handleSubmitButtonClick = () => {
    setShowAlert(false);
    setButtonDisabled(true);
    setProgressValue(20);
    setIsSubmitted(true);
    sendMessageToContentAPI("0");
  };

  const handleImageGenerationButtonClick = () => {
    setShowAlert(false);
    setButtonDisabled(true);
    setProgressValue(20);
    setIsSubmitted(true);
    sendMessageToContentAPI("2");
  };

  const handleTextGenerationButtonClick = () => {
    setShowAlert(false);
    setButtonDisabled(true);
    setProgressValue(20);
    setIsSubmitted(true);
    sendMessageToContentAPI("1");
  };

  const sendMessageToContentAPI = async (typeGen, retryNumber = 0) => {
    try {
      const msg = {
        body: {
          text_model_id: textModel.id,
          temperature: textModelTemperature.value,
          image_model_id: imageModel.id,
          strength: imageModelStrength.value,
          compliance: compliance.value,
          audience: audience.id,
          toneStyle: toneStyle.value,
          platform: platform.value,
          objectives: objectives.value,
          style: imageStyle.value,
          document_id: pdfFile,
          location: location.value,
          source_image: imageFile,
          type_generation: typeGen,
        },
      };

      const response = await API.post("generateContentAPI", "", msg);

      switch (response["type_generation"]) {
        case "0":
          if (isValidType0Message(response)) {
            updateType0Content(response);
            setButtonDisabled(false);
            setProgressValue(100);
          }
          break;
        case "1":
          if (isValidType1Message(response)) {
            updateType1Content(response);
            setButtonDisabled(false);
            setProgressValue(100);
          }
          break;
        case "2":
          if (response["image_content"]) {
            setImage(response["image_content"]);
            setButtonDisabled(false);
            setProgressValue(100);
          }
          break;
      }
    } catch (e) {
      console.log("Error: ", e);

      if (retryNumber < MAX_RETRIES) {
        console.log(`Retrying... Attempt ${retryNumber + 1} of ${MAX_RETRIES}`);
        setTimeout(
          () => {
            sendMessageToContentAPI(typeGen, retryNumber + 1);
          },
          BASE_DELAY * Math.pow(2, retryNumber)
        );
      } else {
        setShowAlert(true);
        setButtonDisabled(false);
        console.log(
          "Max retries reached. Failed to send message to content API."
        );
      }
    }
  };

  const isValidType0Message = (message) => {
    return message["title"] && message["summary"] && message["image_content"];
  };

  const isValidType1Message = (message) => {
    return message["title"] && message["summary"];
  };

  const updateType0Content = (message) => {
    setImage(message["image_content"]);
    setSummary(message["summary"].replace(/^"|"$/g, ""));
    setTitle(message["title"].replace(/^"|"$/g, ""));
    streamContent(
      message["title"].replace(/^"|"$/g, ""),
      message["summary"].replace(/^"|"$/g, "")
    );
  };

  const updateType1Content = (message) => {
    setSummary(message["summary"].replace(/^"|"$/g, ""));
    setTitle(message["title"].replace(/^"|"$/g, ""));
    streamContent(
      message["title"].replace(/^"|"$/g, ""),
      message["summary"].replace(/^"|"$/g, "")
    );
  };

  useEffect(() => {
    async function fetchData() {
      const response = await API.get("api", "/api/assets/specifications");

      setPdfList(
        response.map((result) => ({
          id: result.id,
          value: result.id.replace("reference-specifications/", ""),
          iconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg",
        }))
      );

      const imagesResponse = await Storage.list("reference-images");
      setImageList(
        imagesResponse.results.map((result) => ({
          id: result.key,
          value: result.key.replace("reference-images/", ""),
          iconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/b/bc/Camera-n--redbrush-pd.svg",
        }))
      );
    }
    fetchData();
  }, []);

  const areRequiredFieldsFilled = () => {
    return (
      location &&
      pdfFile &&
      imageStyle &&
      imageFile &&
      imageModelStrength &&
      textModel &&
      textModelTemperature &&
      imageModel &&
      compliance &&
      audience &&
      toneStyle &&
      objectives &&
      platform
    );
  };

  const [buttonDisabled, setButtonDisabled] = useState(
    !areRequiredFieldsFilled()
  );

  useEffect(() => {
    setButtonDisabled(!areRequiredFieldsFilled());
  }, [
    location,
    pdfFile,
    imageFile,
    imageStyle,
    imageModelStrength,
    textModel,
    textModelTemperature,
    imageModel,
    compliance,
    audience,
    toneStyle,
    objectives,
    platform,
  ]);

  const streamContent = (title, summary) => {
    const titleWords = title ? title.split(" ") : [];
    const summaryWords = summary ? summary.split(" ") : [];

    let titleIndex = 0;
    let summaryIndex = 0;

    setDisplaySummary("");
    setDisplayTitle("");

    const interval = setInterval(() => {
      if (titleIndex < titleWords.length) {
        setDisplayTitle((prev) => `${prev} ${titleWords[titleIndex]}`);
        titleIndex++;
      } else if (summaryIndex < summaryWords.length) {
        setDisplaySummary((prev) => `${prev} ${summaryWords[summaryIndex]}`);
        summaryIndex++;
      } else {
        clearInterval(interval);
      }
    }, 80);
  };

  function allFieldsReset() {
    setIsSubmitted(false);
    setProgressValue(0);

    setImageFile("");
    setLocation("");
    setPdfFile("");

    setImageModel("");
    setImageStyle("");
    setImageModelStrength("");

    setTextModel("");
    setTextModelTemperature("");

    setAudience("");
    setCompliance("");
    setPlatform("");
    setToneStyle("");
    setObjectives("");

    setImage("background.svg");
    setDisplaySummary(DEFAULT_SUMMARY);
    setDisplayTitle(DEFAULT_TITLE);
    setSummary(DEFAULT_SUMMARY);
    setTitle(DEFAULT_TITLE);
  }

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
            </div>
          </Box>
        </Header>
      }
    >
      <SpaceBetween size="xxl">
        <Container header={<Header variant="h2">Ad Configuration</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              Choose a document and image to guide the Pharma Studio model. The
              document imparts critical information about the drug or treatment,
              and the image sets the visual context. Together, they blend to
              craft an ad that resonates with your desired audience.
            </Box>

            <ColumnLayout columns={2}>
              <FormField
                label="Document"
                constraintText="Document used to generate the description."
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
                constraintText="Image used to initialize the diffusion process."
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
                constraintText="Location used to generate the localized image."
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
            </ColumnLayout>
          </SpaceBetween>
        </Container>

        <SpaceBetween size="xxl">
          <Container
            header={<Header variant="h2">Ad & Compliance Settings</Header>}
          >
            <SpaceBetween size="s">
              <Box variant="p">
                Choose the desired visual attributes and ensure conformity with
                pharmaceutical industry guidelines. This section guarantees that
                your ad both captures the attention of its intended audience and
                adheres to necessary compliance standards.
              </Box>

              <ColumnLayout columns={2}>
                <FormField
                  label="Compliance and Regulations"
                  constraintText="Adhere to the specific guidelines related to advertising."
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={compliance}
                    options={complianceList}
                    onChange={({ detail }) =>
                      setCompliance(detail.selectedOption)
                    }
                    placeholder="Choose Compliance and Regulations"
                  />
                </FormField>

                <FormField
                  label="Audience"
                  constraintText="Primary group or demographic targeted by this marketing campaign."
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={audience}
                    options={audienceList}
                    onChange={({ detail }) =>
                      setAudience(detail.selectedOption)
                    }
                    placeholder="Choose the audience"
                  />
                </FormField>

                <FormField
                  label="Tone and Style"
                  constraintText="Desired mood or feeling for the ad marketing campaign."
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={toneStyle}
                    options={toneList}
                    onChange={({ detail }) =>
                      setToneStyle(detail.selectedOption)
                    }
                    placeholder="Choose the tone and style"
                  />
                </FormField>

                <FormField
                  label="Objective"
                  constraintText="Primary intention or goal of this marketing campaign."
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={objectives}
                    options={objectivesList}
                    onChange={({ detail }) =>
                      setObjectives(detail.selectedOption)
                    }
                    placeholder="Select the campaign objective"
                  />
                </FormField>

                <FormField
                  label="Platform"
                  constraintText="Digital or traditional medium where the campaign will be displayed."
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={platform}
                    options={platformList}
                    onChange={({ detail }) =>
                      setPlatform(detail.selectedOption)
                    }
                    placeholder="Choose the platform"
                  />
                </FormField>
              </ColumnLayout>
            </SpaceBetween>
          </Container>
        </SpaceBetween>

        <SpaceBetween size="xxl">
          <Container header={<Header variant="h2">Image Model Setup</Header>}>
            <SpaceBetween size="s">
              <Box variant="p">
                Choose a foundational image-to-image model to generate ads based
                on your provided source image. Harnessing the attributes of the
                initial image, the selected model will adeptly refine the
                visuals, ensuring the resulting ad captures the desired
                aesthetic and resonates with the target audience.
              </Box>

              <ColumnLayout columns={2}>
                <FormField
                  label="Image Generation Model"
                  constraintText="Image generation model is used to produce the imagery."
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={imageModel}
                    options={imageModelList}
                    onChange={({ detail }) =>
                      setImageModel(detail.selectedOption)
                    }
                    placeholder="Select an image generation model."
                  />
                </FormField>

                <FormField
                  label="Style"
                  constraintText="Style used to generate the image."
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={imageStyle}
                    options={imageStyleList}
                    onChange={({ detail }) =>
                      setImageStyle(detail.selectedOption)
                    }
                    placeholder="Choose an image style"
                  />
                </FormField>
                <FormField
                  label="Image Resemblance"
                  constraintText="Closeness of a generative image to its input"
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={imageModelStrength}
                    options={imageModelStrengthList}
                    onChange={({ detail }) =>
                      setImageModelStrength(detail.selectedOption)
                    }
                    placeholder="Select Image Match Level"
                  />
                </FormField>
              </ColumnLayout>
            </SpaceBetween>
          </Container>
        </SpaceBetween>

        <SpaceBetween size="xxl">
          <Container header={<Header variant="h2">Text Model Setup</Header>}>
            <SpaceBetween size="s">
              <Box variant="p">
                Choose a foundational text model to generate ads based on your
                provided document. Leveraging the document's details, the chosen
                model will efficiently create content, ensuring the resulting ad
                aligns with the drug or treatment's key information and
                messaging.
              </Box>

              <ColumnLayout columns={2}>
                <FormField
                  label="Text Generation Model"
                  constraintText="Text generation model used to generate the description."
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={textModel}
                    options={textModelList}
                    onChange={({ detail }) =>
                      setTextModel(detail.selectedOption)
                    }
                    placeholder="Select a text generation model"
                  />
                </FormField>

                <FormField
                  label="Creativity"
                  constraintText="Control the creativity of the generated text."
                  stretch={true}
                  i18nStrings={{
                    errorIconAriaLabel: "Error",
                  }}
                >
                  <Select
                    selectedOption={textModelTemperature}
                    options={textModelTemperatureList}
                    onChange={({ detail }) =>
                      setTextModelTemperature(detail.selectedOption)
                    }
                    placeholder="Select creativity level"
                  />
                </FormField>
              </ColumnLayout>
            </SpaceBetween>
          </Container>
        </SpaceBetween>

        <Container
          media={{
            content: <img src={image} alt="placeholder" />,
            position: "side",
            width: "50%",
          }}
        >
          <ScrollableContainer>
            <SpaceBetween direction="vertical" size="s">
              <SpaceBetween direction="vertical" size="xxs">
                <Box variant="h1">{displayTitle}</Box>
              </SpaceBetween>
              <Box fontSize="heading-xs" variant="p">
                {displaySummary}
              </Box>
            </SpaceBetween>
          </ScrollableContainer>
        </Container>

        {isSubmitted && (
          <ProgressBar
            value={progressValue}
            additionalInfo="Please wait while the model is generating the new original content"
            description="This might take a few seconds"
            label="Creating the new localize pharmaceutical ads"
          />
        )}

        {showAlert && <Flashbar items={errorMessage} />}

        <Header
          variant="h2"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                onClick={allFieldsReset}
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/0/05/Gtk-undo-ltr.svg"
              >
                Reset
              </Button>
              <Button
                disabled={buttonDisabled}
                variant="primary"
                onClick={handleTextGenerationButtonClick}
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/e/ef/Inkscape_icons_free-hand-draw.svg"
              >
                Generate Description
              </Button>
              <Button
                disabled={buttonDisabled}
                variant="primary"
                onClick={handleImageGenerationButtonClick}
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/5/51/Farm-Fresh_picture_edit.png"
              >
                Generate Image
              </Button>
              <Button
                disabled={buttonDisabled}
                variant="primary"
                onClick={handleSubmitButtonClick}
                iconUrl="https://upload.wikimedia.org/wikipedia/commons/f/f1/Gnome-colors-edit-select-all.svg"
              >
                Generate Advertisement
              </Button>
            </SpaceBetween>
          }
        ></Header>
      </SpaceBetween>
    </ContentLayout>
  );
}
