ALTER TABLE `admins`
    ADD COLUMN `subscription_start_date` DATETIME(3) NULL,
    ADD COLUMN `subscription_end_date` DATETIME(3) NULL;

UPDATE `admins` AS admin
INNER JOIN (
    SELECT subscription.`admin_id`, subscription.`start_date`, subscription.`end_date`
    FROM `app_subscriptions` AS subscription
    INNER JOIN (
        SELECT `admin_id`, MAX(`id`) AS `latest_id`
        FROM `app_subscriptions`
        GROUP BY `admin_id`
    ) AS latest
        ON latest.`latest_id` = subscription.`id`
) AS latest_subscription
    ON latest_subscription.`admin_id` = admin.`id`
SET
    admin.`subscription_start_date` = latest_subscription.`start_date`,
    admin.`subscription_end_date` = latest_subscription.`end_date`;
