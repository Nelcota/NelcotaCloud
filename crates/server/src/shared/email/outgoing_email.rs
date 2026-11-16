/// A plain-text email ready to send.
pub struct OutgoingEmail {
    pub to: String,
    pub subject: String,
    pub body: String,
}
