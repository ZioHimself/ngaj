Feature: Bluesky Post Search
  As a user
  I want to search for posts on Bluesky
  So that I can find relevant conversations to engage with

  Background:
    Given I have a configured Bluesky adapter
    And I have valid Bluesky credentials

  @requirement:BS-001
  @iteration:1
  Scenario: Search for posts with a single keyword
    Given I want to search for "TypeScript"
    When I call searchPosts with "TypeScript"
    Then I should receive a list of posts
    And each post should contain the keyword "TypeScript"
    And each post should have an id, content, author, and timestamp

  @requirement:BS-002
  @iteration:1
  Scenario: Handle empty search results
    Given I want to search for "xyzabcdefghijk123456789"
    When I call searchPosts with that query
    Then I should receive an empty list
    And no errors should be thrown

  @requirement:BS-003
  @iteration:1
  Scenario: Handle API authentication errors
    Given I have invalid Bluesky credentials
    When I call searchPosts with any query
    Then I should receive an AuthenticationError
    And the error message should indicate invalid credentials

  @requirement:BS-004
  @iteration:1
  Scenario: Handle network errors gracefully
    Given the Bluesky API is unreachable
    When I call searchPosts with any query
    Then I should receive a NetworkError
    And the error should include retry information

  @requirement:BS-005
  @iteration:1
  Scenario: Parse post data correctly
    Given the API returns a post with all fields
    When I call searchPosts
    Then each returned post should have:
      | field       | type   | required |
      | id          | string | yes      |
      | content     | string | yes      |
      | author      | object | yes      |
      | createdAt   | Date   | yes      |
      | likeCount   | number | no       |
      | replyCount  | number | no       |
      | repostCount | number | no       |