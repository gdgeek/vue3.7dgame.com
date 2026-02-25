// verse translations for en-US
export default {
  verse: {
    create: {
      defaultName: "New Scene"
    },
    listPage: {
      myScenes: "My Scenes",
      searchScenes: "Search scenes...",
      sceneName: "Scene Name",
      author: "Author",
      modifiedDate: "Modified Date",
      detailTitle: "Scene Details",
      enterEditor: "Open Editor",
      viewDetail: "View Details",
      rename: "Rename",
      delete: "Delete",
      deleteScene: "Delete Scene",
      sceneIntro: "Scene Description",
      sceneIntroPlaceholder: "Enter scene description (optional)",
      sceneTags: "Scene Tags",
      noTags: "No tags",
      addTag: "Add tag...",
      visibility: "Visibility",
      public: "Public",
      private: "Private",
      type: "Type",
      scene: "Scene",
      createdTime: "Created Time",
      selectImageFile: "Please select an image file",
      imageTooLarge: "Image size cannot exceed 5MB",
      importSuccess: "Scene imported successfully",
      descriptionUpdated: "Description updated",
      descriptionUpdateFailed: "Failed to update description",
      tagAdded: "Tag added",
      tagAddFailed: "Failed to add tag",
      tagRemoved: "Tag removed",
      tagRemoveFailed: "Failed to remove tag",
      visibilityUpdateFailed: "Failed to update visibility",
      editorTitle: "Scene【{name}】",
      copyPromptMessage: "Please enter a new scene name",
      copyPromptTitle: "Copy Scene",
      copySuccess: "Copy succeeded: ",
      copySuffix: " - Copy",
      renameSuccess: "Rename succeeded: ",
      deleteConfirmMessage: "Are you sure you want to delete this scene?",
      deleteConfirmTitle: "Delete Scene",
      cancelInfo: "Cancelled",
      unnamed: "Untitled"
    },
    publicPage: {
      examplesTitle: "Scene Examples",
      examplesSubtitle:
        "Start with our carefully crafted examples to quickly launch your next AR project.",
      searchExamples: "Search examples...",
      viewExample: "View This Example",
      noDescription: "No description",
      allCategory: "All",
      updatedTime: "Updated Time"
    },
    page: {
      dialogTitle: "Create!【Project】",
      dialogSubmit: "Create",
      title: "Create【Project】",
      form: {
        picture: "Cover Image",
        name: "Name",
        description: "Description",
        cancel: "Cancel",
        dialogTitle: "Select File",
        dialogSubmit: "Confirm",
        rules: {
          message1: "Please enter an activity name",
          message2: "Length should be between 3 and 64 characters"
        },
        error: "Form validation failed"
      },
      list: {
        infoContent: {
          author: "Author",
          description: "Description"
        },
        releaseConfirm: {
          message1: "Are you sure you want to release this project?",
          message2: "Prompt",
          confirm: "Confirm",
          cancel: "Cancel",
          success: "Release successful",
          info: "Cancelled"
        },
        toolbar: {
          dialogTitle: "Edit Data",
          dialogSubmit: "Confirm",
          confirm: {
            message1:
              "This action will permanently delete the [Project]. Do you want to continue?",
            message2: "Prompt",
            confirm: "Confirm",
            cancel: "Cancel",
            success: "Deleted successfully!",
            info: "Deletion canceled"
          },
          success: "Modified successfully!",
          changeError: "Modified failed!",
          qrcode: {
            cancel: "Cancel",
            dialogTitle1: "Please use a device to scan the QR code to enter",
            dialogTitle2:
              "Please use a device to scan the QR code to enter the scene."
          }
        }
      }
    },
    view: {
      header: "Edit Information",
      title: "【Project】Name:",
      form: {
        label1: "Multilingual",
        label2: "Name",
        label3: "Description",
        placeholder1: "Please select a language",
        placeholder2: "Please enter a name",
        placeholder3: "Please enter a description",
        submit: "Submit",
        delete: "Delete",
        rules: {
          message1: "Please enter language",
          message2: "Length should be between 2 and 10 characters",
          message3: "Please enter a name",
          message4: "Length should be between 2 and 50 characters",
          message5: "Please enter a description"
        }
      },
      edit: "Edit【Project】",
      eye: "View【Project】",
      info: {
        title: "Scene Information",
        download: "Download"
      },
      verseOpen: "Open【Project】",
      verseClose: "Close【Project】",
      success1: "Edit successful",
      success2: "Submission successful",
      success3: "Deletion successful",
      error1: "Submission failed",
      error2: "Form validation failed",
      error3: "Prefab schema format is invalid",
      scene: "scene",
      tags: {
        confirmRemove: {
          message: "Confirm delete tag?",
          title: "Delete tag from scene",
          confirm: "Confirm",
          cancel: "Cancel",
          success: "Tag deleted successfully",
          error: "Tag deletion cancelled"
        },
        confirmAdd: {
          message: "Confirm add tag?",
          title: "Add tag to scene",
          confirm: "Confirm",
          cancel: "Cancel",
          success: "Tag added successfully",
          error: "Tag addition cancelled"
        }
      },
      metaDialog: {
        title: "Select Entity",
        select: "Select",
        create: "Create New",
        cancel: "Cancel",
        input1: "Please enter Model name",
        input2: "Please enter Entity name",
        prompt: {
          message: "Prompt",
          confirm: "Confirm",
          cancel: "Cancel",
          info: "Cancel Input"
        }
      },
      prefabDialog: {
        title: "Select Prefab Data",
        select: "Select",
        cancel: "Cancel",
        input: "Please enter Model name",
        prompt: {
          message: "Prompt",
          confirm: "Confirm",
          cancel: "Cancel",
          info: "Cancel Input"
        },
        knight: {
          title: "Input Data",
          save: "Save",
          cancel: "Cancel",
          warn: "Clicked Cancel"
        }
      },
      sceneEditor: {
        error1: "No editor available",
        info3: "No save permissions",
        saveAndPublishConfirm: "Saved successfully. Publish now?",
        publishScene: "Publish Scene",
        confirm: "Confirm",
        cancel: "Cancel",
        publishSuccess: "Published successfully",
        publishCanceled: "Publish canceled",
        noProjectToPublish: "No project available to publish",
        noPublishPermission: "No permission to publish",
        saveCompleted: "Save completed",
        noChanges: "No changes in project",
        coverUploadError: "Cover upload error: Image data not found",
        handlerError: "Failed to get file handler",
        coverUploadSuccess: "Cover image uploaded successfully",
        coverUploadFailed: "Failed to upload cover image"
      },
      script: {
        title: "Script",
        save: "Save",
        error1: "No information",
        error2: "No edit permissions",
        error3: "No editor available",
        success: "Saved successfully",
        info: "No changes made",
        edit: "Logical Edit",
        code: "Code View",
        leave: {
          message1: "Unsaved changes detected. Do you want to save?",
          message2: "Prompt",
          confirm: "Yes",
          cancel: "No",
          error: "Save failed",
          info: "Unsaved changes have been discarded"
        }
      },
      public: {
        open: "Public",
        private: "Private",
        addSuccess: "Set to public",
        removeSuccess: "Set to private",
        error: "Operation failed"
      },
      image: {
        updateSuccess: "Image updated successfully",
        updateError: "Failed to update image"
      }
    }
  }
};
