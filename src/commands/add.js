const { logError, readFile, readJSON, repoPath, writeFile, writeJSON } = require('../util')

const { execSync } = require('child_process')
const fse = require('fs-extra')
const path = require('path')
const prompt = require('prompt-sync')()

const checkFileExists = filePath => {
  if (!fse.existsSync(filePath)) {
    logError('Failed to add file. File not found')
    process.exit(1)
  }
}

const getTemplateName = (filePath, providedTemplateName) => {
  let templateName = providedTemplateName || path.basename(filePath)

  while (fse.existsSync(repoPath(`./envy/templates/${templateName}`))) {
    console.log(`Template named '${templateName}' already exists in envy/templates directory`)
    console.log(`Please choose another name`)
    templateName = prompt(`> `, templateName, { sigint: true })
  }

  return templateName
}

const copyFileToTemplates = (filePath, templateFilePath) => {
  fse.copyFileSync(repoPath(filePath), repoPath(templateFilePath))
}

const addTemplateToConfig = (fileName, filePath) => {
  const configPath = repoPath('./envy/paths.json')
  const configContent = readJSON(configPath)
  configContent.push({ from: fileName, to: filePath })
  writeJSON(configPath, configContent)
  return configContent
}

const addFileToGitIgnore = configContent => {
  const gitignorePath = repoPath('./.gitignore')
  const content = readFile(gitignorePath)

  const getIgnorePath = ({ to }) => {
    const relativePath = path.relative(repoPath('.'), repoPath(to))
    return `/${relativePath}`
  }

  const originalIgnoreLines = new RegExp('# Envy files start[^]*# Envy files end', 'g')
  const updatedIgnoreLines =
    '# Envy files start\n' + configContent.map(getIgnorePath).join('\n') + '\n# Envy files end'
  const updatedContent = content.replace(originalIgnoreLines, updatedIgnoreLines)
  writeFile(gitignorePath, updatedContent)
}

const removeFileFromGit = filePath => execSync(`git rm ${filePath}`, { encoding: 'utf-8' })

module.exports = (filePath, { name: providedTemplateName }) => {
  checkFileExists(filePath)

  const templateName = getTemplateName(filePath, providedTemplateName)
  const templatePath = repoPath(`./envy/templates/${templateName}`)
  copyFileToTemplates(filePath, templatePath)

  const configContent = addTemplateToConfig(templateName, filePath)
  addFileToGitIgnore(configContent)
  removeFileFromGit(filePath)

  console.log(`File '${filePath}' successfully added to envy`)
}
