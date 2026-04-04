export interface ConfiguracionEmpresa {
  nombre: string
  emailContacto: string
  emailPagos: string
  telefono: string
  whatsapp: string
  direccionOficina: string
  horariosOficina: string
  cbu: string
  alias: string
  titular: string
  cuit: string
  urlTienda: string
}

export function getConfiguracionEmpresa(): ConfiguracionEmpresa {
  return {
    nombre: "SER Mayorista",
    emailContacto: "contacto@sermayorista.com",
    emailPagos: "pagos@sermayorista.com",
    telefono: "11-XXXX-XXXX",
    whatsapp: "5411XXXXXXXX",
    direccionOficina: "CABA, Argentina",
    horariosOficina: "Lunes a viernes de 9 a 17hs",
    cbu: "XXXX XXXX XXXX XXXX XXXX XX",
    alias: "SER.MAYORISTA",
    titular: "SER Mayorista SRL",
    cuit: "30-XXXXXXXX-X",
    urlTienda: "https://sermayorista.com",
  }
}
