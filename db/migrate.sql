DROP VIEW IF EXISTS v_user_object;
DROP VIEW IF EXISTS v_user;

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS bought;
DROP TABLE IF EXISTS objects;

CREATE TABLE users (
    email VARCHAR(255) NOT NULL,
    password VARCHAR(60) NOT NULL,
    name VARCHAR(60),
    year INTEGER,
    month INTEGER,
    day INTEGER,
    cash NUMERIC,
    UNIQUE(email)
);

CREATE TABLE bought (
    email VARCHAR(255) NOT NULL,
    object TEXT NOT NULL,
    amount INTEGER,
    purchase_price NUMERIC,
    UNIQUE(email)
);

CREATE TABLE objects (
    object TEXT NOT NULL,
    amount INTEGER,
    previous_price VARCHAR(255),
    current_price NUMERIC,
    UNIQUE(object)
);

-- Vyer
CREATE VIEW v_user
AS
SELECT
    u.user_id AS "user_id",
	u.cash AS "cash",
    b.object AS "object",
    b.amount AS "amount",
    b.purchase_price AS "purchase_price",
	o.current_price AS "current_price",
    ROUND(o.current_price - b.purchase_price, 2) AS "difference"
FROM users AS u
	LEFT JOIN bought AS b
		ON u.user_id = b.user_id
	LEFT JOIN objects AS o
        ON b.object = o.object
GROUP BY u.user_id, b.object
;

CREATE VIEW v_user_object
AS
SELECT
    vu.user_id AS "user_id",
	vu.cash AS "cash",
    o.object AS "object",
    o.amount AS "amount",
    vu.amount AS "bought_amount",
    o.current_price AS "current_price"
FROM objects AS o
    JOIN v_user AS vu
        ON o.object = vu.object
GROUP BY o.object
;
