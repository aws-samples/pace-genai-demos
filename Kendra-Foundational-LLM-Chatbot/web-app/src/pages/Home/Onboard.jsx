/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import { useEffect } from "react";
import * as React from "react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { API, Storage } from "aws-amplify";
import Table from "@cloudscape-design/components/table";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import FileUpload from "@cloudscape-design/components/file-upload";
import Flashbar from "@cloudscape-design/components/flashbar";
import Modal from "@cloudscape-design/components/modal";
import moment from "moment";
import Alert from "@cloudscape-design/components/alert";
import { Typography } from "@material-ui/core";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import CodeEditor from "@cloudscape-design/components/code-editor";
import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';
import { Auth } from "aws-amplify";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Select from "@cloudscape-design/components/select";
import RadioGroup from "@cloudscape-design/components/radio-group";
import TextFilter from "@cloudscape-design/components/text-filter";
import Pagination from "@cloudscape-design/components/pagination";
import CollectionPreferences from "@cloudscape-design/components/collection-preferences";

const i18nStrings = {
    loadingState: 'Loading code editor',
    errorState: 'There was an error loading the code editor.',
    errorStateRecovery: 'Retry',
  
    editorGroupAriaLabel: 'Code editor',
    statusBarGroupAriaLabel: 'Status bar',
  
    cursorPosition: (row, column) => `Ln ${row}, Col ${column}`,
    errorsTab: 'Errors',
    warningsTab: 'Warnings',
    preferencesButtonAriaLabel: 'Preferences',
  
    paneCloseButtonAriaLabel: 'Close',
  
    preferencesModalHeader: 'Preferences',
    preferencesModalCancel: 'Cancel',
    preferencesModalConfirm: 'Confirm',
    preferencesModalTheme: 'Theme',
    preferencesModalLightThemes: 'Light themes',
    preferencesModalDarkThemes: 'Dark themes',
  };

export function OnboardDocs() {
    const [selectedItems,setSelectedItems] = React.useState([]);
    const [value, setValue] = React.useState([]);
    const [uploading, setUploading] = React.useState(false);
    const [fileUploaded, setFileUploaded] = React.useState(false);
    const [syncStarted, setSyncStarted] = React.useState(false);
    const [fetchingSyncJobs, setFetchingSyncJobs] = React.useState(false);
    const [syncJobsHistory, setSyncJobsHistory] = React.useState([]);
    const [showSyncRunModal, setShowSyncRunModal] = React.useState(false);
    const [showAclCodeRunModal, setShowAclCodeRunModal] = React.useState(false);
    
    const [codeValue, setCodeValue] = React.useState('{}');
    const [preferences, setPreferences] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [ace, setAce] = React.useState();
    const [aclUploaded, setAclUploaded] = React.useState(undefined);
    const [isUserInAdminGroup, SetIsUserInAdminGroup] = React.useState(false)
    const [showDocumentManagementModal, SetShowDocumentManagementModal] = React.useState(false)
    const [ selectedFolder, setSelectedFolder  ] = React.useState(undefined);
    const [folderType, setFolderType] = React.useState("");
    const [newFolderName, setNewFolderName] = React.useState("");
    const [folderOption, SetFolderOption] = React.useState(true);
    const [s3Folders, setS3Folders] = React.useState([]);
    const [showPickFilesMsg, setShowPickFilesMsg] = React.useState(false);

    const showDocumentModel = async () => {
        setFolderType("");
        setSelectedFolder(undefined);
        setNewFolderName("")
        SetFolderOption(true)

        if (value.length === 0){
            setShowPickFilesMsg(true)
            return
        }

        if (value.length > 0)
            SetShowDocumentManagementModal(true)
    }
    
    const handleUpload = async () => {
        if (value.length === 0){
            return
        }
            
     

        // Remove the prefix public/ if it already exists in the key name
        const key_prefix = newFolderName === "" ? selectedFolder.value.replace("public/","") : newFolderName
        //console.log(key_prefix);
        setFileUploaded(false);
        setUploading(true);
        await Promise.all(
            value.map(async(v) => {
                try {
                    await Storage.put(`${key_prefix}/${v.name}`, v);

                    const init = {
                        body: {
                            "DocId": `public/${key_prefix}/${v.name}`
                        }
                    };
                    await API.post("api", "/api/document/create", init);

                } catch (error) {
                    console.log("Error uploading file: ", error);
                    setValue([]);
                    setUploading(false);
                }
            })
        )
        setUploading(false);
        setFileUploaded(true);
        setValue([]);
        setNewFolderName("");
        setSelectedFolder(undefined)
        SetFolderOption(false)
        setFolderType("")
    };

    const onSyncNow = async() => {
        setShowSyncRunModal(true)
        
    }
    const onModifyAcl = async() => {
        setAclUploaded(undefined)
        const acl_response = await API.get("api", "/api/acl");
        setCodeValue(JSON.stringify(acl_response, null, 2));
        setShowAclCodeRunModal(true)
    }

    const OnUploadAcl = async() => {
        console.log(codeValue);
        const init = {
            body: JSON.parse(codeValue)
          };
        const response = await API.post("api", "/api/acl/create", init);
        setAclUploaded(true)
    }
   


    useEffect(() => {
        console.log(folderType);
        const fetchAllFolders = async() => {
            const response = await API.get("api", "/api/document/list/folders");
            setS3Folders(response)
        }

        if (folderType === "Existing"){
            setNewFolderName("")
            fetchAllFolders()
        }
        else if (folderType === "New"){
            setSelectedFolder(undefined)
        }

    }, [folderType]);

    useEffect(() => {

        const creds = async() => {
            const session  = await Auth.currentSession()
            const groups = session.getIdToken().payload["cognito:groups"];
            if (groups.includes("Admin"))
                SetIsUserInAdminGroup(true);
            

        }
        creds()
        

        setFetchingSyncJobs(true)
        const fetchSyncRuns = async() => {
            const response = await API.get("api", "/api/datasyncjob");
            console.log(response);
            setSyncJobsHistory(response)
        }
        fetchSyncRuns()
        setFetchingSyncJobs(false)

        async function loadAce() {
            const ace = await import('ace-builds');
            await import('ace-builds/webpack-resolver');
            ace.config.set('useStrictCSP', true);
            return ace;
        }
        loadAce()
        .then(ace => setAce(ace))
        .finally(() => setLoading(false));

      }, []);

    const onSyncRunRefresh = async() => {
        setFetchingSyncJobs(true)
        const response = await API.get("api", "/api/datasyncjob");
        setSyncJobsHistory(response)
        setFetchingSyncJobs(false)
    }

    const syncNow = async() => {
        await API.post("api", "/api/datasync", {
            body: {},
        });
        setSyncStarted(true)
        setShowSyncRunModal(false)
        
    }

    const closeSyncDialog = () => {
        setShowSyncRunModal(false)
    }


    return (

        <ContentLayout className="onboard-container"
            header={
                <SpaceBetween direction="horizontal" size="s">
                    
                <Header className="header"
                    actions={
                        <>
                        <SpaceBetween direction="vertical" size="m" >
                            <Typography style={{marginRight: "100px"}}>Upload documents into S3 for ingestion into a Kendra Index.  
                                Consider uploading documents directly into the S3 Bucket if there are too many. Refer to the Cloudformation stack output key named KendraDataSyncS3Bucket, 
                                for the bucket name. Click on Sync Now to start the document ingestion process. Note that the sync time varies based on the number of documents updated. Document types supported: 
                                PDF, TXT, HTML, XML, JSON, RTF, PPT (Only text content), DOCX (Only text content).</Typography>    
                            <SpaceBetween direction="horizontal" size="l" ><br/>
                                <Alert  
                                        statusIconAriaLabel="Info"
                                        type="warning"
                                        header="About sync jobs"
                                    >
                                    If an Amazon Kendra synchronization job is in progress, any additional synchronization jobs queued will fail.
                                </Alert>
                            
                                <SpaceBetween direction="horizontal" size="xxl">
                                    <Button iconName="caret-right-filled" onClick={onSyncNow}>Sync now</Button>
                                    {
                                        syncStarted && 
                                        <Flashbar items={
                                            [
                                            {
                                                type: "success",
                                                loading: false,
                                                content: (
                                                    <>
                                                        Amazon Kendra data sync job has been queued. Please track the Job status in the table below.
                                                    </>
                                                )
                                            }
                                            ]
                                        } 
                                        />
                                    }
                                </SpaceBetween>
                            </SpaceBetween>
                                
                                <ExpandableSection headerText="Role based access control">
                                <Typography>Follow these steps to configure role based access.
                                    <ul>
                                        <li>
                                            Create one or more Cognito user groups and add Cognito users into them. Users should be grouped based on their roles.
                                        </li>
                                        <li>
                                            Modify <Button iconName="edit" variant="inline-icon" onClick={onModifyAcl}> Modify ACL</Button> the ACL configuration file and uploaded back into S3.
                                            
                                        </li>
                                        <li>
                                            Create multiple folders in S3 and upload documents based on the user roles and access requirements. 
                                        </li>
                                        <li>
                                            Click on Sync Now to start the document ingestion process and for ACLs to take effect.
                                        </li>
                                    </ul>
                                </Typography>

                                </ExpandableSection>
                                
                            </SpaceBetween>
                        </>
                      }
                >
                    Add new documents
                </Header>
                    
                </SpaceBetween>
            }
        >
      <Container>
        <SpaceBetween direction="vertical" size="s">
            <Container >
                
                <Box variant="h3">
                        Upload documents
                </Box><br/>
                
                <SpaceBetween direction="horizontal" size="xxl">
                    
                    <FileUpload
                        onChange={({ detail }) => {
                            setValue(detail.value)
                            setUploading(false);
                            setFileUploaded(false);

                            if (detail.value.length > 0)
                                setShowPickFilesMsg(false)
                        }}
                        value={value}
                        i18nStrings={{
                        uploadButtonText: e =>
                            e ? "Choose files" : "Choose file",
                        dropzoneText: e =>
                            e
                            ? "Drop files to upload"
                            : "Drop file to upload",
                        removeFileAriaLabel: e =>
                            `Remove file ${e + 1}`,
                        limitShowFewer: "Show fewer files",
                        limitShowMore: "Show more files",
                        errorIconAriaLabel: "Error"
                        }}
                        //showFileLastModified
                        //showFileSize
                        multiple
                        tokenLimit={3}
                    />
                <Box float="right">
                    <Button variant="primary" iconName="add-plus" onClick={showDocumentModel}>Upload</Button>
                </Box>
                {
                    showPickFilesMsg &&
                    <Alert  
                            statusIconAriaLabel="Warning"
                            type="warning"
                        >
                        Please select file(s) to upload
                    </Alert>
                }    
               {/*  {
                    uploading &&
                    <Flashbar items={
                        [
                        
                            {
                                type: "success",
                                loading: true,
                                content: (
                                    <>
                                    File(s) Upload in progress.
                                    </>
                                )
                            }
                        ]
                    } />
                } */}
                {/* {
                    fileUploaded &&
                    <Flashbar items={
                        [
                            {
                                type: "success",
                                loading: false,
                                dismissible: true,
                                content: (
                                    <>
                                    File(s) Uploaded successfully.
                                    </>
                                )
                            }
                        ]
                    } />
                } */}
                
                </SpaceBetween>
            </Container>
            <Container >
            <Table 
                onSelectionChange={({ detail }) =>
                    setSelectedItems(detail.selectedItems)
                }
                selectedItems={selectedItems}
                
                columnDefinitions={[
                    {
                    id: "CreatedOn",
                    header: "Start time",
                    cell: e => moment(e.CreatedOn).format('YYYY-MM-DD HH:mm:ss a'),
                    sortingField: "CreatedOn",
                    isRowHeader: true
                    },
                    {
                    id: "Status",
                    header: "Status",
                    cell: e => e.Status,
                    sortingField: "Status"
                    }
                ]}
                columnDisplay={[
                    { id: "CreatedOn", visible: true },
                    { id: "Status", visible: true }
                ]}
                items={syncJobsHistory}
                loading={fetchingSyncJobs}
                loadingText="Loading sync runs ..."
                trackBy="name"
                stripedRows
                empty={
                    <Box textAlign="center" color="inherit">
                    <Box
                        padding={{ bottom: "s" }}
                        variant="p"
                        color="inherit"
                    >
                        No sync runs to display.
                    </Box>
                    </Box>
                }
                
                header={
                    <Header
                        variant="h2"
                        description="Amazon Kendra data sync run history"
                        actions={
                            <Button iconName={"refresh"} onClick={onSyncRunRefresh}>
                                
                            </Button>
                        }
                    >
                    Sync run history
                    </Header>
                }
            />
            </Container>
        </SpaceBetween>
      </Container>

      <Modal
            onDismiss={() => setShowSyncRunModal(false)}
            visible={showSyncRunModal}
            closeAriaLabel="Close modal"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="m">
                        <Button variant="normal" onClick={() => closeSyncDialog()}>
                            No
                        </Button>
                        <Button variant="primary" onClick={() => syncNow()}>
                            Yes
                        </Button>
                    </SpaceBetween>
                </Box>
            }
            header="Sync Index"
        >
            Would you like to start a Kendra Sync job ?
        </Modal>

        <Modal
            onDismiss={() => setShowAclCodeRunModal(false)}
            size={isUserInAdminGroup ? "max": "large"}
            visible={showAclCodeRunModal}
            closeAriaLabel="Close modal"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="m">
                        
                        {
                            aclUploaded &&
                            <Flashbar items={[{
                                type: "success",
                                content: "ACL uploaded successfully.",
                                dismissible: true,
                            }]} />
                        }
                        {
                            aclUploaded === false &&
                            <Flashbar items={[{
                                type: "error",
                                content: "ACL upload failed.",
                                dismissible: true,
                            }]} />
                        }
                        <Button variant="normal" onClick={() => setShowAclCodeRunModal(false)}>
                            Close
                        </Button>
                        <Button variant="primary" onClick={() => OnUploadAcl()} disabled={!isUserInAdminGroup}>
                            Upload ACL
                        </Button>
                    </SpaceBetween>
                </Box>
            }
            header="Role based access control"
        >   
            {
                isUserInAdminGroup ?
                <CodeEditor
                    ace={ace}
                    value={codeValue}
                    language="json"
                    onDelayedChange={event => setCodeValue(event.detail.value)}
                    preferences={preferences}
                    onPreferencesChange={event => setPreferences(event.detail)}
                    loading={loading}
                    i18nStrings={i18nStrings}
                    // should match the imports on top of this file
                    themes={{ light: ['dawn'], dark: ['tomorrow_night_bright'] }}
                /> :
                <Flashbar items={[{
                    type: "error",
                    content: "Access Denied: You don't have permissions to edit ACLs."
                }]} />
            }
            
        </Modal>    

        <Modal
            onDismiss={() => SetShowDocumentManagementModal(false)}
            size="large"
            visible={showDocumentManagementModal}
            closeAriaLabel="Close modal"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="m">
                        {
                            fileUploaded &&
                            <Flashbar items={
                                [
                                    {
                                        type: "success",
                                        loading: false,
                                        content: (
                                            <>
                                            File(s) Uploaded successfully.
                                            </>
                                        )
                                    }
                                ]
                            } />
                        }
                        <Button variant="normal" onClick={() => SetShowDocumentManagementModal(false)}>
                            Close
                        </Button>
                        <Button variant="primary" loading={uploading} onClick={() => handleUpload()} disabled={newFolderName.trim() === ""  && selectedFolder === undefined ? true : false}>
                            Upload
                        </Button>
                    </SpaceBetween>
                </Box>
            }
            header="Select an S3 folder"
        >   
          <ColumnLayout columns={1}>
            <SpaceBetween direction="vertical" size="l">
                <RadioGroup     
                    onChange={({ detail }) => setFolderType(detail.value)}      
                    value={folderType}      
                    items={[
                        { value: "New", label: "Upload to new folder", disabled: !folderOption }
                        ]}    
                />
                <FormField label="Enter the folder name (Ex. - folder1/subfolder1 )">
                    <Input 
                        onChange={({ detail }) => setNewFolderName(detail.value)}      
                        value={newFolderName}
                        disabled={(folderType === "New" && folderOption) ? false : true}
                    />
                </FormField>
                <RadioGroup 
                    onChange={({ detail }) => setFolderType(detail.value)}      
                    value={folderType}      
                    items={[
                        { value: "Existing", label: "Upload to existing folder", disabled: !folderOption }
                        ]}    
                />
                <FormField>
                <Select disabled={folderType === "Existing" ? false : true}
                    selectedOption={selectedFolder}
                    onChange={({ detail }) =>
                        setSelectedFolder(detail.selectedOption)
                    }
                    options={s3Folders}
                    filteringType="auto"
                />
                </FormField>
                
            </SpaceBetween>
            

          </ColumnLayout>
       
        </Modal>   
    </ContentLayout>

        
    );


}
