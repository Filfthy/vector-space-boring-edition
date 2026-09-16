# vector-space-boring-edition

Vector Space Planet Flight Demo

This repository is set up to publish a read-only static site with GitHub Pages.

## How to upload your files

1. Copy your site files into this repository.
2. Make sure the public homepage is named `index.html` in the repository root.
3. Commit and push the files to the `main` branch so the deployment workflow runs.
4. In GitHub, enable **Pages** for this repository and use **GitHub Actions** as the source.

If you want deployments to run from a different branch name, update `.github/workflows/deploy-pages.yml` to match that branch before pushing.

Visitors will be able to open the published `index.html` in their browser, but they will not be able to edit files through the site.
