/*
  # Add rules_signed column to reservations

  1. Changes
    - Add `rules_signed` boolean column to reservations table (DEFAULT false)
    - Add `rules_signed_at` timestamptz column to track when rules were signed

  2. Purpose
    - Track whether a client has signed the house rules
    - Enable real-time status updates in admin dashboard
    - Support the digital signature feature in client space
*/

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rules_signed boolean DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rules_signed_at timestamptz;
