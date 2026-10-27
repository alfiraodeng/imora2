# GOD MODE integration

GOD MODE is a password-gated workspace inside IMORA. It accepts only a separately deployed 3D workspace through the server-only `GOD_MODE_3D_URL` environment value, then renders it inside IMORA after an authorized session is created. Do not append `embed=1`: that upstream mode deliberately hides its control panels.

The evaluation source is [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view). Its code is MIT, but individual third-party datasets and providers have their own terms. For IMORA, enable only licensed, operationally relevant sources and keep public surveillance, person-tracking, and safety-critical decisioning out of scope.

The supplied password gate is an operational UI boundary. Production-grade authorization should later be enforced with IMORA's Supabase roles and a server-side audit trail.
