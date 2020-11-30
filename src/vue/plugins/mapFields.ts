export interface MapFieldsOption {
    form: string | undefined,
    fields: string[],
    base: string,
    mutation: string
}

export function mapFields(options: MapFieldsOption) {
    const object: any = {};
    for (let x = 0; x < options.fields.length; x++) {
        const field = options.fields[x];
        if (options.form) {
            object[options.form][field] = {
                get() {
                    return this.$store.state[options.base][field];
                },
                set(value: any) {
                    this.$store.commit(options.mutation, { [field]: value });
                }
            };
        } else {
            object[field] = {
                get() {
                    return this.$store.state[options.base][field];
                },
                set(value: any) {
                    this.$store.commit(options.mutation, { [field]: value });
                }
            };
        }
    }
    return object;
}