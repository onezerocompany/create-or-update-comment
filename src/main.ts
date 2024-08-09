import * as core from '@actions/core'
import * as github from '@actions/github'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // make sure it is a pull request
    const pr = github.context.payload.pull_request?.number
    if (!pr) {
      core.info('Not a pull request. Skipping.')
      return
    }

    // Get the inputs from the workflow file
    const token = core.getInput('github-token', { required: true })
    const id = core.getInput('id', { required: true })
    const title = core.getInput('title')
    const body = core.getInput('body')

    const preamble = `<!-- comment-id:${id} -->\n\n`
    const content = `${preamble}\n${title}\n\n${body}`

    // Create a new GitHub client
    const client = github.getOctokit(token)

    // find the comment with the preamble
    const comments = await client.rest.issues.listComments({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: pr,
      per_page: 25
    })

    const comment = comments.data.find(c => c.body?.includes(preamble))

    if (comment) {
      // update the comment
      await client.rest.issues.updateComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        comment_id: comment.id,
        body: content
      })
    } else {
      // create a new comment
      await client.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: pr,
        body: content
      })
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
