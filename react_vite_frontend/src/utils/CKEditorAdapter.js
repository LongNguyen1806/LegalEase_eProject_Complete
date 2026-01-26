export default class CKEditorAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then(
      (file) =>
        new Promise((resolve, reject) => {
          const data = new FormData();
          data.append("upload", file);

          fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/content/upload-inline-image`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("ADMIN_ACCESS_TOKEN")}`,
            },
            body: data,
          })
            .then((response) => {
              if (!response.ok) {
                return reject("Network response was not ok");
              }
              return response.json();
            })
            .then((result) => {
              if (result.uploaded) {
                resolve({
                  default: result.url,
                });
              } else {
                reject(result.error ? result.error.message : "Upload failed");
              }
            })
            .catch((error) => {
              reject("Upload failed");
            });
        }),
    );
  }

  abort() {}
}
