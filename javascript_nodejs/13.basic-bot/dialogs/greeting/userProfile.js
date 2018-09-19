// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Simple user profile object.
 */
class UserProfile {
  constructor(name, city) {
    this.name = name ? name : undefined;
    this.city = city ? city : undefined;
  }
}; 

module.exports.UserProfile = UserProfile;

