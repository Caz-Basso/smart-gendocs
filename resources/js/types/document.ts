export type FieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'email'
    | 'phone'
    | 'cpf'
    | 'cnpj'
    | 'cep'
    | 'currency'
    | 'select'
    | 'radio'
    | 'checkbox';

export interface FieldOption {
    value: string;
    label: string;
}

export interface DynamicField {
    id: string;
    name: string;
    slug: string;
    type: FieldType;
    section?: string;
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    defaultValue?: string;
    options?: FieldOption[];
}

export interface DocumentModel {
    id: string;
    name: string;
    description?: string;
    fileName?: string;
    fields: DynamicField[];
    defaultData?: Record<string, string>;
    preview?: string[];
}

const option = (value: string, label: string): FieldOption => ({
    value,
    label,
});

export const MOCK_MODELS: DocumentModel[] = [
    {
        id: 'proposta-comercial',
        name: 'Proposta Comercial',
        description:
            'Proposta comercial para prestação de serviços de tecnologia e desenvolvimento.',
        fileName: 'proposta_comercial.docx',

        fields: [
            {
                id: 'pc-01',
                name: 'CNPJ',
                slug: 'cnpj',
                type: 'cnpj',
                section: 'Dados da Empresa Contratada',
                required: true,
                placeholder: '00.000.000/0000-00',
                helpText: 'CNPJ da sua empresa emitente da proposta.',
            },
            {
                id: 'pc-02',
                name: 'Razão Social',
                slug: 'razao_social',
                type: 'text',
                section: 'Dados da Empresa Contratada',
                required: true,
                placeholder: 'Ex.: Acme Soluções em Tecnologia Ltda.',
            },
            {
                id: 'pc-03',
                name: 'CEP',
                slug: 'cep',
                type: 'cep',
                section: 'Dados da Empresa Contratada',
                required: true,
                placeholder: '00000-000',
            },
            {
                id: 'pc-04',
                name: 'Logradouro',
                slug: 'logradouro',
                type: 'text',
                section: 'Dados da Empresa Contratada',
                required: true,
                placeholder: 'Ex.: Av. Paulista, 1000 - Sala 42',
            },
            {
                id: 'pc-05',
                name: 'Bairro',
                slug: 'bairro',
                type: 'text',
                section: 'Dados da Empresa Contratada',
                required: true,
                placeholder: 'Ex.: Bela Vista',
            },
            {
                id: 'pc-06',
                name: 'Município',
                slug: 'municipio',
                type: 'text',
                section: 'Dados da Empresa Contratada',
                required: true,
                placeholder: 'Ex.: São Paulo',
            },
            {
                id: 'pc-07',
                name: 'UF',
                slug: 'uf',
                type: 'select',
                section: 'Dados da Empresa Contratada',
                required: true,
                options: [
                    option('AC', 'Acre'),
                    option('AL', 'Alagoas'),
                    option('AP', 'Amapá'),
                    option('AM', 'Amazonas'),
                    option('BA', 'Bahia'),
                    option('CE', 'Ceará'),
                    option('DF', 'Distrito Federal'),
                    option('ES', 'Espírito Santo'),
                    option('GO', 'Goiás'),
                    option('MA', 'Maranhão'),
                    option('MT', 'Mato Grosso'),
                    option('MS', 'Mato Grosso do Sul'),
                    option('MG', 'Minas Gerais'),
                    option('PA', 'Pará'),
                    option('PB', 'Paraíba'),
                    option('PR', 'Paraná'),
                    option('PE', 'Pernambuco'),
                    option('PI', 'Piauí'),
                    option('RJ', 'Rio de Janeiro'),
                    option('RN', 'Rio Grande do Norte'),
                    option('RS', 'Rio Grande do Sul'),
                    option('RO', 'Rondônia'),
                    option('RR', 'Roraima'),
                    option('SC', 'Santa Catarina'),
                    option('SP', 'São Paulo'),
                    option('SE', 'Sergipe'),
                    option('TO', 'Tocantins'),
                ],
            },

            {
                id: 'pc-08',
                name: 'Nome do Cliente / Razão Social',
                slug: 'cliente_nome',
                type: 'text',
                section: 'Dados do Cliente',
                required: true,
                placeholder: 'Ex.: João da Silva ou Empresa XYZ Ltda.',
            },
            {
                id: 'pc-09',
                name: 'E-mail de Contato',
                slug: 'cliente_email',
                type: 'email',
                section: 'Dados do Cliente',
                required: true,
                placeholder: 'cliente@empresa.com.br',
            },
            {
                id: 'pc-10',
                name: 'Telefone de Contato',
                slug: 'cliente_telefone',
                type: 'phone',
                section: 'Dados do Cliente',
                required: true,
                placeholder: '(00) 00000-0000',
            },

            {
                id: 'pc-11',
                name: 'Descrição detalhada do Serviço',
                slug: 'descricao_servico',
                type: 'textarea',
                section: 'Dados da Proposta',
                required: true,
                placeholder:
                    'Descreva os escopos, entregáveis e etapas da execução...',
            },
            {
                id: 'pc-12',
                name: 'Prazo de Execução (em dias)',
                slug: 'prazo_execucao',
                type: 'number',
                section: 'Dados da Proposta',
                required: true,
                placeholder: 'Ex.: 30',
                helpText: 'Informe a quantidade estimada de dias úteis.',
            },
            {
                id: 'pc-13',
                name: 'Valor Total da Proposta',
                slug: 'valor_proposta',
                type: 'currency',
                section: 'Dados da Proposta',
                required: true,
                placeholder: 'R$ 0,00',
            },
            {
                id: 'pc-14',
                name: 'Forma de Pagamento',
                slug: 'forma_pagamento',
                type: 'radio',
                section: 'Dados da Proposta',
                required: true,
                options: [
                    option('pix', 'PIX à Vista'),
                    option('boleto_30', 'Boleto Faturado (30 dias)'),
                    option('transferencia', 'Transferência Bancária / TED'),
                    option('cartao_parcelado', 'Cartão de Crédito Parcelado'),
                ],
            },
            {
                id: 'pc-15',
                name: 'Data da Proposta',
                slug: 'data_proposta',
                type: 'date',
                section: 'Dados da Proposta',
                required: true,
            },
        ],

        preview: [
            'PROPOSTA COMERCIAL',
            '',
            'A empresa {{razao_social}}, inscrita no CNPJ sob nº {{cnpj}}, com sede em {{logradouro}}, {{bairro}} - {{municipio}}/{{uf}}, apresenta a presente proposta comercial para {{cliente_nome}}.',
            '',
            'OBJETO DA PROPOSTA',
            '{{descricao_servico}}',
            '',
            'CONDIÇÕES COMERCIAIS E PRAZOS',
            'O prazo estimado para execução integral dos serviços descritos será de {{prazo_execucao}} dias.',
            'O valor total do investimento é de {{valor_proposta}}, a ser quitado via {{forma_pagamento}}.',
            '',
            'Esta proposta possui validade de 15 dias a contar de sua data de emissão.',
            '',
            '{{municipio}}, {{data_proposta}}.',
        ],
    },

    {
        id: 'contrato-estagio',
        name: 'Termo de Compromisso de Estágio',
        description:
            'Termo para formalização de estágio curricular supervisionado obrigatório ou não obrigatório.',
        fileName: 'contrato_estagio.docx',

        fields: [
            {
                id: 'ce-01',
                name: 'Nome Completo do Estudante',
                slug: 'estudante_nome',
                type: 'text',
                section: 'Dados do Estudante',
                required: true,
                placeholder: 'Ex.: Carlos Eduardo Santos',
            },
            {
                id: 'ce-02',
                name: 'CPF',
                slug: 'estudante_cpf',
                type: 'cpf',
                section: 'Dados do Estudante',
                required: true,
                placeholder: '000.000.000-00',
            },
            {
                id: 'ce-03',
                name: 'E-mail do Estudante',
                slug: 'estudante_email',
                type: 'email',
                section: 'Dados do Estudante',
                required: true,
                placeholder: 'estudante@instituicao.edu.br',
            },
            {
                id: 'ce-04',
                name: 'Curso de Graduação/Técnico',
                slug: 'curso',
                type: 'select',
                section: 'Dados do Estudante',
                required: true,
                options: [
                    option('administracao', 'Administração'),
                    option('ciencia_computacao', 'Ciência da Computação'),
                    option('direito', 'Direito'),
                    option('enfermagem', 'Enfermagem'),
                    option('engenharia_civil', 'Engenharia Civil'),
                    option('engenharia_software', 'Engenharia de Software'),
                    option('marketing', 'Marketing / Comunicação'),
                    option('pedagogia', 'Pedagogia'),
                    option('sistemas_informacao', 'Sistemas de Informação'),
                ],
            },
            {
                id: 'ce-05',
                name: 'Semestre Atual',
                slug: 'semestre',
                type: 'number',
                section: 'Dados do Estudante',
                required: true,
                placeholder: 'Ex.: 5',
            },

            {
                id: 'ce-06',
                name: 'Razão Social da Concedente',
                slug: 'empresa_razao_social',
                type: 'text',
                section: 'Empresa Concedente',
                required: true,
                placeholder: 'Razão social da empresa de destino',
            },
            {
                id: 'ce-07',
                name: 'CNPJ da Empresa',
                slug: 'empresa_cnpj',
                type: 'cnpj',
                section: 'Empresa Concedente',
                required: true,
                placeholder: '00.000.000/0000-00',
            },
            {
                id: 'ce-08',
                name: 'Nome do Supervisor Interno',
                slug: 'supervisor',
                type: 'text',
                section: 'Empresa Concedente',
                required: true,
                placeholder: 'Nome e cargo do responsável técnico',
            },

            {
                id: 'ce-09',
                name: 'Data de Início do Estágio',
                slug: 'data_inicio',
                type: 'date',
                section: 'Condições do Estágio',
                required: true,
            },
            {
                id: 'ce-10',
                name: 'Data de Término do Estágio',
                slug: 'data_termino',
                type: 'date',
                section: 'Condições do Estágio',
                required: true,
            },
            {
                id: 'ce-11',
                name: 'Carga Horária Semanal (Horas)',
                slug: 'carga_horaria',
                type: 'number',
                section: 'Condições do Estágio',
                required: true,
                placeholder: 'Ex.: 30',
                helpText: 'Limite máximo permitido de 30h semanais.',
            },
            {
                id: 'ce-12',
                name: 'Modalidade de Trabalho',
                slug: 'modalidade',
                type: 'radio',
                section: 'Condições do Estágio',
                required: true,
                options: [
                    option('presencial', 'Presencial'),
                    option('hibrido', 'Híbrido'),
                    option('remoto', 'Remoto (Home Office)'),
                ],
            },
            {
                id: 'ce-13',
                name: 'Valor da Bolsa-Auxílio (Mensal)',
                slug: 'valor_bolsa',
                type: 'currency',
                section: 'Condições do Estágio',
                required: true,
                placeholder: 'R$ 0,00',
            },
            {
                id: 'ce-14',
                name: 'Concede Auxílio-Transporte?',
                slug: 'auxilio_transporte',
                type: 'checkbox',
                section: 'Condições do Estágio',
                helpText:
                    'Marque caso o estagiário receba reembolso ou vale-transporte.',
            },
        ],

        preview: [
            'TERMO DE COMPROMISSO DE ESTÁGIO',
            '',
            'Pelo presente instrumento, a concedente {{empresa_razao_social}}, inscrita no CNPJ sob nº {{empresa_cnpj}}, celebra Termo de Compromisso de Estágio com o(a) estudante {{estudante_nome}}, portador(a) do CPF nº {{estudante_cpf}}, regularmente matriculado(a) no {{semestre}}º período do curso de {{curso}}.',
            '',
            'CLÁUSULA PRIMEIRA — DA VIGÊNCIA E CARGA HORÁRIA',
            'O estágio será realizado no período de {{data_inicio}} a {{data_termino}}, com jornada semanal de {{carga_horaria}} horas na modalidade {{modalidade}}.',
            '',
            'CLÁUSULA SEGUNDA — DA SUPERVISÃO E REMUNERAÇÃO',
            'As atividades serão supervisionadas por {{supervisor}}.',
            'O estagiário receberá uma bolsa-auxílio mensal no valor de {{valor_bolsa}}.',
        ],
    },

    {
        id: 'declaracao-matricula',
        name: 'Declaração de Matrícula Acadêmica',
        description:
            'Documento oficial para comprovação de vínculo ativo com a instituição de ensino.',
        fileName: 'declaracao_matricula.docx',

        fields: [
            {
                id: 'dm-01',
                name: 'Nome Completo do Aluno',
                slug: 'aluno_nome',
                type: 'text',
                section: 'Identificação do Estudante',
                required: true,
                placeholder: 'Nome civil completo do discente',
            },
            {
                id: 'dm-02',
                name: 'CPF',
                slug: 'aluno_cpf',
                type: 'cpf',
                section: 'Identificação do Estudante',
                required: true,
                placeholder: '000.000.000-00',
            },
            {
                id: 'dm-03',
                name: 'Número da Matrícula / R.A.',
                slug: 'numero_matricula',
                type: 'text',
                section: 'Identificação do Estudante',
                required: true,
                placeholder: 'Ex.: 2026100892',
            },

            {
                id: 'dm-04',
                name: 'Curso Pertencente',
                slug: 'aluno_curso',
                type: 'select',
                section: 'Vínculo Acadêmico',
                required: true,
                options: [
                    option('administracao', 'Bacharelado em Administração'),
                    option('arquitetura', 'Arquitetura e Urbanismo'),
                    option('biomedicina', 'Biomedicina'),
                    option('direito', 'Bacharelado em Direito'),
                    option('enfermagem', 'Enfermagem'),
                    option('engenharia_civil', 'Engenharia Civil'),
                    option('medicina', 'Medicina'),
                    option('psicologia', 'Psicologia'),
                    option('sistemas_informacao', 'Sistemas de Informação'),
                ],
            },
            {
                id: 'dm-05',
                name: 'Série / Período Atual',
                slug: 'aluno_periodo',
                type: 'number',
                section: 'Vínculo Acadêmico',
                required: true,
                placeholder: 'Ex.: 3',
            },
            {
                id: 'dm-06',
                name: 'Turno das Aulas',
                slug: 'aluno_turno',
                type: 'radio',
                section: 'Vínculo Acadêmico',
                required: true,
                options: [
                    option('matutino', 'Matutino'),
                    option('vespertino', 'Vespertino'),
                    option('noturno', 'Noturno'),
                    option('integral', 'Integral'),
                ],
            },
            {
                id: 'dm-07',
                name: 'Semestre Letivo Vigente',
                slug: 'semestre_letivo',
                type: 'text',
                section: 'Vínculo Acadêmico',
                required: true,
                placeholder: 'Ex.: 2026/2',
            },
            {
                id: 'dm-08',
                name: 'Data da Emissão do Documento',
                slug: 'data_emissao',
                type: 'date',
                section: 'Dados da Declaração',
                required: true,
            },
        ],

        preview: [
            'DECLARAÇÃO DE MATRÍCULA',
            '',
            'Declaramos, para os devidos fins e a quem possa interessar, que {{aluno_nome}}, inscrito(a) no CPF sob o nº {{aluno_cpf}}, é aluno(a) regularmente matriculado(a) sob o número de R.A./Matrícula {{numero_matricula}}.',
            '',
            'DADOS DO VÍNCULO:',
            'Curso: {{aluno_curso}}',
            'Período/Módulo: {{aluno_periodo}}º Período',
            'Turno: {{aluno_turno}}',
            'Semestre Letivo de Referência: {{semestre_letivo}}',
            '',
            'Por ser verdade, firmamos a presente declaração.',
            '',
            'Documento gerado eletronicamente em {{data_emissao}}.',
        ],
    },

    {
        id: 'contrato-servicos',
        name: 'Contrato de Prestação de Serviços Genérico',
        description:
            'Instrumento contratual bilateral padrão para formalização de serviços contínuos ou pontuais.',
        fileName: 'contrato_servicos.docx',

        fields: [
            {
                id: 'cs-01',
                name: 'Nome / Razão Social do Contratante',
                slug: 'contratante_nome',
                type: 'text',
                section: 'Dados do Contratante',
                required: true,
                placeholder: 'Nome completo ou Razão Social do cliente',
            },
            {
                id: 'cs-02',
                name: 'CPF ou CNPJ do Contratante',
                slug: 'contratante_documento',
                type: 'text',
                section: 'Dados do Contratante',
                required: true,
                placeholder: 'Informe apenas os números com pontuação',
            },
            {
                id: 'cs-03',
                name: 'E-mail Principal',
                slug: 'contratante_email',
                type: 'email',
                section: 'Dados do Contratante',
                required: true,
                placeholder: 'contato@contratante.com',
            },

            {
                id: 'cs-04',
                name: 'Razão Social da Contratada',
                slug: 'contratada_nome',
                type: 'text',
                section: 'Dados da Contratada (Prestador)',
                required: true,
                placeholder: 'Razão social do prestador do serviço',
            },
            {
                id: 'cs-05',
                name: 'CNPJ da Contratada',
                slug: 'contratada_cnpj',
                type: 'cnpj',
                section: 'Dados da Contratada (Prestador)',
                required: true,
                placeholder: '00.000.000/0000-00',
            },

            {
                id: 'cs-06',
                name: 'Objeto Resumido do Contrato',
                slug: 'objeto_contrato',
                type: 'textarea',
                section: 'Objeto do Contrato',
                required: true,
                placeholder:
                    'Descreva detalhadamente o serviço que será contratado e prestado...',
            },
            {
                id: 'cs-07',
                name: 'Valor Mensal / Total',
                slug: 'valor_mensal',
                type: 'currency',
                section: 'Condições Financeiras',
                required: true,
                placeholder: 'R$ 0,00',
            },
            {
                id: 'cs-08',
                name: 'Forma de Pagamento Aceita',
                slug: 'forma_pagamento',
                type: 'select',
                section: 'Condições Financeiras',
                required: true,
                options: [
                    option('pix', 'Chave PIX'),
                    option('boleto', 'Boleto Bancário'),
                    option('transferencia', 'Transferência Bancária / TED'),
                    option('cartao', 'Cartão de Crédito'),
                ],
            },

            {
                id: 'cs-09',
                name: 'Data de Início da Vigência',
                slug: 'data_inicio',
                type: 'date',
                section: 'Vigência Contratual',
                required: true,
            },
            {
                id: 'cs-10',
                name: 'Data do Encerramento',
                slug: 'data_termino',
                type: 'date',
                section: 'Vigência Contratual',
                required: true,
            },
            {
                id: 'cs-11',
                name: 'Renovação Automática de Contrato?',
                slug: 'renovacao_automatica',
                type: 'checkbox',
                section: 'Vigência Contratual',
                helpText:
                    'Indica se o contrato se renova por iguais períodos caso não haja denúncia formal.',
            },
        ],

        preview: [
            'CONTRATO DE PRESTAÇÃO DE SERVIÇOS',
            '',
            'CONTRATANTE: {{contratante_nome}}, inscrito(a) sob o CPF/CNPJ nº {{contratante_documento}}, com e-mail {{contratante_email}}.',
            '',
            'CONTRATADA: {{contratada_nome}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{contratada_cnpj}}.',
            '',
            'CLÁUSULA PRIMEIRA — DO OBJETO',
            'O presente contrato tem por objeto a prestação dos seguintes serviços: {{objeto_contrato}}.',
            '',
            'CLÁUSULA SEGUNDA — DA PRECIFICAÇÃO E FORMA DE PAGAMENTO',
            'Pela execução dos serviços acordados, o CONTRATANTE pagará à CONTRATADA o montante de {{valor_mensal}}, devendo o pagamento ser efetuado através de {{forma_pagamento}}.',
            '',
            'CLÁUSULA TERCEIRA — DA VIGÊNCIA',
            'O presente instrumento vigorará entre {{data_inicio}} e {{data_termino}}.',
        ],
    },
];
