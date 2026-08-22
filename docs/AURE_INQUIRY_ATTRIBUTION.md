# AURE Inquiry Attribution

## Purpose

Swell records an inquiry as **AURE-originated** when the visitor reaches the Swell contact flow from `aure.swellmarketing.xyz` or through an AURE link carrying `utm_source=aure`. The classification is calculated by the Swell lead endpoint from the submitted attribution record. It is not accepted merely because a browser sends an arbitrary label.

## Public-link convention

Every AURE link that opens the Swell contact flow uses the following parameters:

| Parameter | Value pattern | Purpose |
|---|---|---|
| `utm_source` | `aure` | Identifies AURE as the originating method brand. |
| `utm_medium` | `referral` | Distinguishes a cross-site method referral from paid acquisition. |
| `utm_campaign` | `aure_method` or `aure_public_record` | Separates general method inquiries from a public case record. |
| `utm_content` | Specific placement, such as `hero_cta` or `omny_audit` | Identifies the AURE surface that created the inquiry. |

## CRM fields

| Object | Property | Value |
|---|---|---|
| Contact | `swell_source` | `aure` when the source or referrer is AURE. |
| Contact | `swell_inquiry_origin` | `aure` or `general`. |
| Contact | `swell_inquiry_origin_detail` | Campaign, placement, and referrer detail for AURE inquiries. |
| Deal | `swell_inquiry_origin` | Carried onto a qualified deal created from the inquiry. |
| Deal | `swell_inquiry_origin_detail` | Carried onto the qualified deal for reporting. |

## Reporting workflow

Create a HubSpot contact view filtered to `swell_inquiry_origin = aure`, then report on contacts and qualified deals by `swell_inquiry_origin_detail`. Review the count of AURE-originated contacts, qualified opportunities, and closed-won deals monthly. Keep the source property and inquiry-origin property separate: the first captures acquisition source, while the second answers the business question of whether AURE created the demand.

## Provisioning and verification

The `data/hubspot-manifest.json` file defines the new contact and deal properties. The provisioning script now merges missing enumeration options into existing HubSpot properties before it creates new fields. This follows HubSpot’s documented partial property-update model, where supplied property fields are overwritten, so the script preserves current options and adds only the values declared by Swell.[1]

Run the existing HubSpot setup process against the target portal before relying on the fields in production. Then submit a non-production test through an AURE-tagged link and verify that the contact and, if qualified, associated deal carry the expected `aure` origin and placement detail. Do not use real prospect data for the verification submission.

The production referral URL for the AURE method entry point returned HTTP `200` while preserving `utm_source=aure`, `utm_medium=referral`, `utm_campaign=aure_method`, and its placement value on 22 August 2026. The endpoint and CRM field values still require a non-production submission after the HubSpot property provisioning step.

## Reference

[1] [HubSpot Developers, “Update a property”](https://developers.hubspot.com/docs/api-reference/legacy/crm/properties/update-property)
