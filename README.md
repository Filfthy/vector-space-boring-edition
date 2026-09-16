# vector-space-boring-edition

Vector Space Planet Flight Demo

This repository is set up to publish a read-only static site with GitHub Pages.

## How to upload your files

1. Copy your site files into this repository.
2. Put the files you want to publish in the `public/` folder.
3. Make sure the public homepage is named `public/index.html`.
4. Commit and push the files to the `main` branch so the deployment workflow runs.
5. In GitHub, enable **Pages** for this repository and use **GitHub Actions** as the source. If Pages is already set to deploy from a branch, change the source to **GitHub Actions**.

If you want deployments to run from a different branch name, update `.github/workflows/deploy-pages.yml` to match that branch before pushing.

Visitors will be able to open the published `index.html` in their browser, but they will not be able to edit files through the site.
